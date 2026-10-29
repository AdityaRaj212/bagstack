/**
 * Eval harness for the AI import + NL query layers.
 *
 *   npx tsx tests/eval/run-eval.ts                      # offline provider (no key needed)
 *   npx tsx tests/eval/run-eval.ts --faults             # + simulated LLM extraction errors
 *   npx tsx tests/eval/run-eval.ts --provider anthropic # real model (needs ANTHROPIC_API_KEY)
 *
 * Reports extraction field accuracy, rows held back by validation, categorisation
 * accuracy, and the key safety metric: postings that reached the ledger but do
 * not match a labelled, postable row ("unreconciled postings", target 0).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { initSchema, seedDefaultCategories } from '../../src/lib/db';
import { FinanceService } from '../../src/lib/finance-service';
import { AiImportService } from '../../src/lib/ai/import-service';
import { askQuestion } from '../../src/lib/ai/query-service';
import { OfflineProvider } from '../../src/lib/ai/offline-provider';
import { AnthropicProvider } from '../../src/lib/ai/anthropic-provider';
import { ResilientProvider, type UsageLogEntry } from '../../src/lib/ai/resilient-provider';
import type { LlmProvider, ProviderResult, StructuredRequest, ToolCall, ToolChoiceRequest } from '../../src/lib/ai/provider';
import type { Extraction } from '../../src/lib/ai/schemas';
import { EVAL_TODAY, OPENING, type LedgerTxn, type NlQuestion, type Sample } from './generate-fixtures';

const here = path.dirname(fileURLToPath(import.meta.url));
const USER = 'eval_user';

// --- fault injection ---------------------------------------------------------------

export const FAULT_TYPES = [
  'decimal_shift',
  'digit_typo',
  'flip_direction',
  'swap_day_month',
  'drop_row',
  'hallucinate_row',
  'fabricated_credit',
  'misread_balance',
] as const;
type Fault = (typeof FAULT_TYPES)[number];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Applies a realistic transcription error to an extraction. Returns null if not applicable. */
export function applyFault(ex: Extraction, fault: Fault, seed: number): Extraction | null {
  const rows = ex.rows.map(r => ({ ...r }));
  if (rows.length === 0) return null;
  const i = seed % rows.length;
  const r = rows[i];
  switch (fault) {
    case 'decimal_shift': {
      const [w, f = '00'] = r.amount.split('.');
      r.amount = `${w}${f[0]}.${f.slice(1)}0`;
      break;
    }
    case 'digit_typo': {
      const [w, f = '00'] = r.amount.split('.');
      const pos = w.length > 1 ? w.length - 2 : 0;
      r.amount = `${w.slice(0, pos)}${(Number(w[pos]) + 3) % 10}${w.slice(pos + 1)}.${f}`;
      if (/^0\d/.test(r.amount)) r.amount = `1${r.amount}`;
      break;
    }
    case 'flip_direction':
      r.direction = r.direction === 'debit' ? 'credit' : 'debit';
      break;
    case 'swap_day_month': {
      const [y, m, d] = r.date.split('-');
      if (Number(d) > 12 || d === m) return null;
      r.date = `${y}-${d}-${m}`;
      break;
    }
    case 'drop_row':
      rows.splice(i, 1);
      break;
    case 'hallucinate_row':
      rows.splice(i + 1, 0, { ...r, merchant: 'AMAZON PAY INDIA', balance_after: null });
      break;
    case 'fabricated_credit':
      rows.splice(i, 0, { date: r.date, amount: '1999.00', merchant: 'CASHBACK BONUS', direction: 'credit', balance_after: null });
      break;
    case 'misread_balance':
      if (r.balance_after === null) return null;
      r.balance_after = r.balance_after.replace(/(\d)\./, (_, d) => `${(Number(d) + 1) % 10}.`);
      break;
  }
  return { ...ex, rows };
}

class FaultInjectingProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsBinaryInput: boolean;
  applied: Fault[] = [];
  constructor(private readonly inner: LlmProvider, private readonly seed: number) {
    this.name = `${inner.name}+faults`;
    this.model = inner.model;
    this.supportsBinaryInput = inner.supportsBinaryInput;
  }
  async generateStructured<T>(req: StructuredRequest<T>): Promise<ProviderResult<T>> {
    const res = await this.inner.generateStructured(req);
    if (req.task !== 'extract') return res;
    let ex = res.data as unknown as Extraction;
    // Two independent faults per document
    for (let k = 0; k < 2; k++) {
      const fault = FAULT_TYPES[(this.seed + k * 5) % FAULT_TYPES.length];
      const next = applyFault(ex, fault, this.seed + k * 7);
      if (next) {
        ex = next;
        this.applied.push(fault);
      }
    }
    return { ...res, data: ex as unknown as T };
  }
  chooseTool(req: ToolChoiceRequest): Promise<ProviderResult<ToolCall | null>> {
    return this.inner.chooseTool(req);
  }
}

// --- helpers ---------------------------------------------------------------------------

function freshDb() {
  const db = new DatabaseSync(':memory:');
  initSchema(db);
  db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(USER, 'eval@bagstack.local', 'Eval');
  seedDefaultCategories(db, USER);
  return db;
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((n * 100) / d).toFixed(1)}%`);

function buildProvider(name: string): LlmProvider {
  if (name === 'anthropic') return new AnthropicProvider(process.env.AI_MODEL || 'claude-opus-5-5');
  return new OfflineProvider();
}

// --- import eval ------------------------------------------------------------------------

interface SampleResult {
  id: string;
  flaw: string | null;
  expectedRows: number;
  extractedRows: number;
  matched: number;
  fieldsCorrect: { date: number; amount: number; direction: number; merchant: number; category: number };
  categoryLabelled: number;
  validated: number;
  review: number;
  reasons: Record<string, number>;
  reconciliation: string;
  posted: number;
  correctPostings: number;
  unreconciledPostings: number;
  heldButPostable: number;
  faults: string[];
  error?: string;
}

async function evalSample(sample: Sample, providerName: string, faults: boolean, usage: UsageLogEntry[]): Promise<SampleResult> {
  const db = freshDb();
  const finance = new FinanceService(db);
  const account = finance.createAccount({ userId: USER, name: 'Eval Savings', type: 'savings', openingBalance: 0, currency: sample.accountCurrency })!;
  for (const s of sample.ledgerSeed) {
    finance.createTransaction({ userId: USER, accountId: account.id, type: s.direction === 'credit' ? 'income' : 'expense', amount: s.amount, date: s.date, merchantName: s.merchant, notes: 'seed' });
  }

  const base = buildProvider(providerName);
  const injector = faults ? new FaultInjectingProvider(base, hash(sample.id)) : null;
  const provider = new ResilientProvider(injector ?? base, { logger: e => usage.push(e), timeoutMs: 120_000 });
  const service = new AiImportService(provider, db, () => new Date(`${EVAL_TODAY}T12:00:00`));

  const result: SampleResult = {
    id: sample.id, flaw: sample.flaw, expectedRows: sample.expected.rows.length, extractedRows: 0, matched: 0,
    fieldsCorrect: { date: 0, amount: 0, direction: 0, merchant: 0, category: 0 }, categoryLabelled: 0,
    validated: 0, review: 0, reasons: {}, reconciliation: 'n/a', posted: 0, correctPostings: 0, unreconciledPostings: 0, heldButPostable: 0, faults: [],
  };

  try {
    const batch = await service.extract(USER, { accountId: account.id, kind: sample.kind, source: { format: 'text', text: sample.input } });
    result.faults = injector?.applied ?? [];
    result.extractedRows = batch.rows.length;
    result.reconciliation = batch.reconciliation.status;

    // Field accuracy: pair each labelled row with the best unused extracted row
    const used = new Set<number>();
    for (const [ei, exp] of sample.expected.rows.entries()) {
      const score = (r: (typeof batch.rows)[number]) => (r.amount === exp.amount ? 2 : 0) + (r.date === exp.date ? 1 : 0) + (norm(r.merchant) === norm(exp.merchant) ? 1 : 0);
      let best = -1;
      let bestScore = 0;
      batch.rows.forEach((r, i) => {
        if (used.has(i)) return;
        const sc = score(r) + (i === ei ? 0.5 : 0);
        if (sc > bestScore) { best = i; bestScore = sc; }
      });
      if (best < 0 || bestScore < 1) continue;
      used.add(best);
      const got = batch.rows[best];
      result.matched++;
      if (got.date === exp.date) result.fieldsCorrect.date++;
      if (got.amount === exp.amount) result.fieldsCorrect.amount++;
      if (got.direction === exp.direction) result.fieldsCorrect.direction++;
      const gm = norm(got.merchant);
      const em = norm(exp.merchant);
      if (gm && (gm === em || gm.includes(em) || em.includes(gm))) result.fieldsCorrect.merchant++;
      if (exp.category !== undefined) {
        result.categoryLabelled++;
        const gotName = got.categoryId ? (db.prepare('SELECT name FROM categories WHERE id = ?').get(got.categoryId) as any)?.name ?? null : null;
        if (gotName === exp.category) result.fieldsCorrect.category++;
      }
    }

    for (const r of batch.rows) {
      if (r.status === 'validated') result.validated++;
      else if (r.status === 'review') result.review++;
      for (const reason of r.reasons) result.reasons[reason.code] = (result.reasons[reason.code] ?? 0) + 1;
    }

    // Simulated user: confirm every row the validator marked as postable
    const toPost = batch.rows.filter(r => r.status === 'validated').map(r => r.id);
    service.confirm(USER, batch.id, toPost);

    const postings = db.prepare(`SELECT date, amount, type FROM transactions WHERE user_id = ? AND notes LIKE 'Imported via AI%'`).all(USER) as any[];
    result.posted = postings.length;
    const postable = sample.expected.rows.filter(r => r.shouldPost).map(r => ({ ...r, used: false }));
    for (const p of postings) {
      const match = postable.find(e => !e.used && e.date === p.date && e.amount === p.amount && (e.direction === 'credit' ? 'income' : 'expense') === p.type);
      if (match) { match.used = true; result.correctPostings++; }
      else result.unreconciledPostings++;
    }
    result.heldButPostable = postable.filter(e => !e.used).length;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }
  return result;
}

// --- NL eval ----------------------------------------------------------------------------

interface QuestionResult { id: string; question: string; expectedTool: string | null; gotTool: string | null; toolCorrect: boolean; expectedValue: number | null; gotValue: number | null; resultCorrect: boolean; answer: string }

async function evalQuestions(providerName: string, usage: UsageLogEntry[]): Promise<QuestionResult[]> {
  const { transactions } = JSON.parse(fs.readFileSync(path.join(here, 'nl', 'ledger.json'), 'utf8')) as { transactions: LedgerTxn[] };
  const questions = JSON.parse(fs.readFileSync(path.join(here, 'nl', 'questions.json'), 'utf8')) as NlQuestion[];
  const db = freshDb();
  const finance = new FinanceService(db);
  const savings = finance.createAccount({ userId: USER, name: 'HDFC Savings', type: 'savings', openingBalance: OPENING.savings })!;
  const wallet = finance.createAccount({ userId: USER, name: 'Cash Wallet', type: 'cash', openingBalance: OPENING.wallet })!;
  // A second profile with its own data: answers must never include it
  db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run('other_profile', 'other@bagstack.local', 'Other');
  const other = finance.createAccount({ userId: 'other_profile', name: 'Other', type: 'savings', openingBalance: 99900000 })!;
  finance.createTransaction({ userId: 'other_profile', accountId: other.id, type: 'expense', amount: 5000000, date: '2026-05-10', merchantName: 'Swiggy', categoryId: 'cat-food-delivery' });

  for (const t of transactions) {
    finance.createTransaction({ userId: USER, accountId: t.account === 'savings' ? savings.id : wallet.id, type: t.type, amount: t.amount, date: t.date, merchantName: t.merchant, categoryId: t.categoryId });
  }

  const provider = new ResilientProvider(buildProvider(providerName), { logger: e => usage.push(e), timeoutMs: 120_000 });
  const out: QuestionResult[] = [];
  for (const q of questions) {
    let res;
    try {
      res = await askQuestion(provider, db, USER, q.question, EVAL_TODAY);
    } catch (err) {
      res = { ok: false as const, answer: `error: ${err instanceof Error ? err.message : err}`, tool: null };
    }
    const gotTool = res.ok ? res.tool : null;
    const gotValue = res.ok ? res.value : null;
    const toolCorrect = gotTool === q.expectedTool;
    const resultCorrect = q.expectedTool === null ? !res.ok : res.ok && gotValue === q.expectedValue;
    out.push({ id: q.id, question: q.question, expectedTool: q.expectedTool, gotTool, toolCorrect, expectedValue: q.expectedValue, gotValue, resultCorrect, answer: res.answer });
  }
  return out;
}

// --- reporting ----------------------------------------------------------------------------

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  const line = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i])).join(' | ')} |`;
  return [line(headers), `|${widths.map(w => '-'.repeat(w + 2)).join('|')}|`, ...rows.map(line)].join('\n');
}

export interface EvalSummary {
  provider: string;
  faults: boolean;
  samples: number;
  expectedRows: number;
  extractedRows: number;
  fieldAccuracy: Record<string, string>;
  categoryAccuracy: string;
  rowsValidated: number;
  rowsHeldForReview: number;
  reasonCounts: Record<string, number>;
  postings: number;
  correctPostings: number;
  unreconciledPostings: number;
  postableRowsHeld: number;
  faultsInjected: number;
  errors: number;
  nl: { questions: number; toolAccuracy: string; resultAccuracy: string };
  tokens: { input: number; output: number; costMicroUsd: number; calls: number; avgLatencyMs: number };
}

export async function runEval(opts: { provider: string; faults: boolean; skipNl?: boolean }) {
  const samples = fs.readdirSync(path.join(here, 'samples')).filter(f => f.endsWith('.json')).sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(here, 'samples', f), 'utf8')) as Sample);
  const usage: UsageLogEntry[] = [];
  const results: SampleResult[] = [];
  for (const s of samples) results.push(await evalSample(s, opts.provider, opts.faults, usage));
  const questions = opts.skipNl ? [] : await evalQuestions(opts.provider, usage);

  const sum = (f: (r: SampleResult) => number) => results.reduce((a, r) => a + f(r), 0);
  const expectedRows = sum(r => r.expectedRows);
  const reasonCounts: Record<string, number> = {};
  for (const r of results) for (const [k, v] of Object.entries(r.reasons)) reasonCounts[k] = (reasonCounts[k] ?? 0) + v;

  const summary: EvalSummary = {
    provider: opts.provider,
    faults: opts.faults,
    samples: results.length,
    expectedRows,
    extractedRows: sum(r => r.extractedRows),
    fieldAccuracy: Object.fromEntries((['date', 'amount', 'direction', 'merchant'] as const).map(k => [k, pct(sum(r => r.fieldsCorrect[k]), expectedRows)])),
    categoryAccuracy: pct(sum(r => r.fieldsCorrect.category), sum(r => r.categoryLabelled)),
    rowsValidated: sum(r => r.validated),
    rowsHeldForReview: sum(r => r.review),
    reasonCounts,
    postings: sum(r => r.posted),
    correctPostings: sum(r => r.correctPostings),
    unreconciledPostings: sum(r => r.unreconciledPostings),
    postableRowsHeld: sum(r => r.heldButPostable),
    faultsInjected: sum(r => r.faults.length),
    errors: results.filter(r => r.error).length,
    nl: {
      questions: questions.length,
      toolAccuracy: pct(questions.filter(q => q.toolCorrect).length, questions.length),
      resultAccuracy: pct(questions.filter(q => q.resultCorrect).length, questions.length),
    },
    tokens: {
      input: usage.reduce((a, u) => a + u.usage.inputTokens, 0),
      output: usage.reduce((a, u) => a + u.usage.outputTokens, 0),
      costMicroUsd: usage.reduce((a, u) => a + u.costMicroUsd, 0),
      calls: usage.length,
      avgLatencyMs: usage.length ? Math.round(usage.reduce((a, u) => a + u.latencyMs, 0) / usage.length) : 0,
    },
  };
  return { summary, results, questions };
}

function render(run: Awaited<ReturnType<typeof runEval>>) {
  const { summary: s, results, questions } = run;
  const out: string[] = [];
  out.push(`## Eval results: provider=${s.provider}${s.faults ? ' + fault injection' : ''}\n`);
  out.push(table(['Metric', 'Value'], [
    ['Samples (statements + receipts)', String(s.samples)],
    ['Labelled rows / extracted rows', `${s.expectedRows} / ${s.extractedRows}`],
    ['Field accuracy: date', s.fieldAccuracy.date],
    ['Field accuracy: amount', s.fieldAccuracy.amount],
    ['Field accuracy: direction', s.fieldAccuracy.direction],
    ['Field accuracy: merchant', s.fieldAccuracy.merchant],
    ['Category accuracy (labelled rows)', s.categoryAccuracy],
    ['Rows validated', String(s.rowsValidated)],
    ['Rows held for review by validation', String(s.rowsHeldForReview)],
    ['Ledger postings after confirm', `${s.postings} (${s.correctPostings} correct)`],
    ['**Unreconciled postings reaching ledger**', `**${s.unreconciledPostings}**`],
    ['Postable rows held for manual review', String(s.postableRowsHeld)],
    ...(s.faults ? [['Faults injected', String(s.faultsInjected)]] : []),
    ['Errors', String(s.errors)],
    ['NL questions: tool choice correct', `${s.nl.toolAccuracy} of ${s.nl.questions}`],
    ['NL questions: result correct', `${s.nl.resultAccuracy} of ${s.nl.questions}`],
    ['Model calls / tokens in / out', `${s.tokens.calls} / ${s.tokens.input} / ${s.tokens.output}`],
    ['Cost (USD)', `$${(s.tokens.costMicroUsd / 1_000_000).toFixed(4)}`],
    ['Avg latency per call', `${s.tokens.avgLatencyMs} ms`],
  ]));
  out.push('\n### Validation reasons\n');
  out.push(table(['Reason', 'Rows'], Object.entries(s.reasonCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)])));
  out.push('\n### Per sample\n');
  out.push(table(['Sample', 'Flaw', 'Rows exp/got', 'Recon', 'Valid', 'Review', 'Posted ok', 'Unrecon', ...(s.faults ? ['Faults'] : [])],
    results.map(r => [r.id, r.flaw ?? '', `${r.expectedRows}/${r.extractedRows}`, r.error ? `ERR: ${r.error.slice(0, 30)}` : r.reconciliation, String(r.validated), String(r.review), String(r.correctPostings), String(r.unreconciledPostings), ...(s.faults ? [r.faults.join(',')] : [])])));
  if (questions.length) {
    out.push('\n### NL questions\n');
    out.push(table(['Id', 'Expected tool', 'Got tool', 'Tool', 'Result'],
      questions.map(q => [q.id, q.expectedTool ?? '(none)', q.gotTool ?? '(none)', q.toolCorrect ? 'ok' : 'MISS', q.resultCorrect ? 'ok' : 'MISS'])));
  }
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const provider = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : 'offline';
  const faults = args.includes('--faults');
  runEval({ provider, faults }).then(run => {
    const md = render(run);
    console.log(md);
    const dir = path.join(here, 'results');
    fs.mkdirSync(dir, { recursive: true });
    const base = `${provider}${faults ? '-faults' : ''}`;
    fs.writeFileSync(path.join(dir, `${base}.md`), md + '\n');
    fs.writeFileSync(path.join(dir, `${base}.json`), JSON.stringify(run, null, 2) + '\n');
    if (run.summary.unreconciledPostings > 0) process.exitCode = 1;
  });
}
