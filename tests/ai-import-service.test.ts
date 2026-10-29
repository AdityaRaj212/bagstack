import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initSchema, seedDefaultCategories } from '../src/lib/db';
import { FinanceService } from '../src/lib/finance-service';
import { AiImportService } from '../src/lib/ai/import-service';
import type { LlmProvider, ProviderResult, StructuredRequest, ToolCall } from '../src/lib/ai/provider';
import type { Extraction } from '../src/lib/ai/schemas';

/** Returns canned model output so tests control exactly what the "LLM" proposes. */
class ScriptedProvider implements LlmProvider {
  readonly name = 'scripted';
  readonly model = 'scripted';
  readonly supportsBinaryInput = false;
  constructor(private extraction: Extraction, private categories: Record<number, string | null> = {}) {}
  async generateStructured<T>(req: StructuredRequest<T>): Promise<ProviderResult<T>> {
    const data =
      req.task === 'extract'
        ? this.extraction
        : { assignments: Object.entries(this.categories).map(([i, c]) => ({ index: Number(i), category_id: c })) };
    return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 }, model: this.model };
  }
  async chooseTool(): Promise<ProviderResult<ToolCall | null>> {
    return { data: null, usage: { inputTokens: 0, outputTokens: 0 }, model: this.model };
  }
}

const SOURCE = [
  'Statement Period: 01/05/2026 to 31/05/2026',
  'Opening Balance: 10,000.00',
  '02/05/2026  SWIGGY ORDER        450.00 Dr   9,550.00',
  '05/05/2026  ACME SALARY       5,000.00 Cr  14,550.00',
  '07/05/2026  UNKNOWN PAYEE       200.00 Dr  14,350.00',
  'Closing Balance: 14,350.00',
].join('\n');

const EXTRACTION: Extraction = {
  document_type: 'statement',
  currency: 'INR',
  period_start: '2026-05-01',
  period_end: '2026-05-31',
  opening_balance: '10000.00',
  closing_balance: '14350.00',
  stated_total: null,
  rows: [
    { date: '2026-05-02', amount: '450.00', merchant: 'SWIGGY ORDER', direction: 'debit', balance_after: '9550.00' },
    { date: '2026-05-05', amount: '5000.00', merchant: 'ACME SALARY', direction: 'credit', balance_after: '14550.00' },
    { date: '2026-05-07', amount: '200.00', merchant: 'UNKNOWN PAYEE', direction: 'debit', balance_after: '14350.00' },
  ],
};

describe('AiImportService', () => {
  let db: DatabaseSync;
  let finance: FinanceService;
  let accountId: string;
  const userId = 'ai_user_a';
  const otherUser = 'ai_user_b';
  const now = () => new Date('2026-06-15T12:00:00');

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initSchema(db);
    for (const id of [userId, otherUser]) {
      db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, `${id}@test.local`, id);
      seedDefaultCategories(db, id);
    }
    finance = new FinanceService(db);
    accountId = finance.createAccount({ userId, name: 'Savings', type: 'savings', openingBalance: 1000000 })!.id;
  });

  const extract = (provider: LlmProvider, user = userId, account = accountId) =>
    new AiImportService(provider, db, now).extract(user, { accountId: account, kind: 'statement', source: { format: 'text', text: SOURCE } });

  const ledgerCount = () => (db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE user_id = ?`).get(userId) as any).c;

  it('stores proposals in the review queue without touching the ledger', async () => {
    const batch = await extract(new ScriptedProvider(EXTRACTION));
    expect(batch.reconciliation.status).toBe('balanced');
    expect(batch.rows.map(r => r.status)).toEqual(['validated', 'validated', 'validated']);
    expect(ledgerCount()).toBe(0);
  });

  it('posts only confirmed, validated rows and updates the account balance', async () => {
    const service = new AiImportService(new ScriptedProvider(EXTRACTION), db, now);
    const batch = await service.extract(userId, { accountId, kind: 'statement', source: { format: 'text', text: SOURCE } });
    const res = service.confirm(userId, batch.id, [batch.rows[0].id, batch.rows[1].id]);
    expect(res.posted).toBe(2);
    expect(ledgerCount()).toBe(2);
    expect(finance.getAccountById(accountId, userId)!.current_balance).toBe(1000000 - 45000 + 500000);
    // Confirming the same row twice is a no-op
    expect(service.confirm(userId, batch.id, [batch.rows[0].id]).posted).toBe(0);
  });

  it('refuses to post anything from a statement that does not reconcile', async () => {
    const tampered: Extraction = { ...EXTRACTION, rows: EXTRACTION.rows.slice(0, 2) }; // model dropped a row
    const service = new AiImportService(new ScriptedProvider(tampered), db, now);
    const batch = await service.extract(userId, { accountId, kind: 'statement', source: { format: 'text', text: SOURCE } });
    expect(batch.reconciliation.status).toBe('mismatch');
    const res = service.confirm(userId, batch.id, batch.rows.map(r => r.id));
    expect(res.posted).toBe(0);
    expect(res.refused).toHaveLength(2);
    expect(ledgerCount()).toBe(0);

    // User adds the missing row; the statement now reconciles and rows become postable
    const fixed = service.addRow(userId, batch.id, { date: '2026-05-07', amount: '200.00', merchant: 'UNKNOWN PAYEE', direction: 'debit' });
    expect(fixed.reconciliation.status).toBe('balanced');
    expect(fixed.rows.filter(r => r.status === 'validated')).toHaveLength(3);
  });

  it('holds a hallucinated amount and lets the user correct it', async () => {
    const wrong: Extraction = {
      ...EXTRACTION,
      rows: EXTRACTION.rows.map((r, i) => (i === 0 ? { ...r, amount: '4500.00' } : r)),
    };
    const service = new AiImportService(new ScriptedProvider(wrong), db, now);
    const batch = await service.extract(userId, { accountId, kind: 'statement', source: { format: 'text', text: SOURCE } });
    expect(batch.rows[0].reasons.map(r => r.code)).toEqual(expect.arrayContaining(['amount_not_in_source', 'balance_chain_break']));
    expect(batch.rows[0].approvable).toBe(false);
    expect(() => service.approveRow(userId, batch.rows[0].id)).toThrow(/blocking/);

    const edited = service.editRow(userId, batch.rows[0].id, { amount: '450.00' });
    expect(edited.reconciliation.status).toBe('balanced');
    expect(edited.rows[0].status).toBe('validated');
  });

  it('keeps model categories only when they exist in the user list with the right type', async () => {
    const provider = new ScriptedProvider(EXTRACTION, {
      0: 'cat-food-delivery', // valid expense category
      1: 'cat-food-delivery', // expense category on a credit row: rejected
      2: 'cat-made-up', // not in the list: rejected
    });
    const batch = await extract(provider);
    expect(batch.rows.map(r => r.categoryId)).toEqual(['cat-food-delivery', null, null]);
    expect(batch.rows[0].categorySource).toBe('llm');
  });

  it('prevents another profile from reading, editing or confirming a batch', async () => {
    const service = new AiImportService(new ScriptedProvider(EXTRACTION), db, now);
    const batch = await service.extract(userId, { accountId, kind: 'statement', source: { format: 'text', text: SOURCE } });
    expect(() => service.getBatch(otherUser, batch.id)).toThrow(/Forbidden/);
    expect(() => service.confirm(otherUser, batch.id, batch.rows.map(r => r.id))).toThrow(/Forbidden/);
    expect(() => service.editRow(otherUser, batch.rows[0].id, { amount: '1.00' })).toThrow(/Forbidden/);
    expect(() => service.approveRow(otherUser, batch.rows[0].id)).toThrow(/Forbidden/);
    expect(ledgerCount()).toBe(0);
  });

  it('rejects importing into an account the user does not own', async () => {
    const foreign = finance.createAccount({ userId: otherUser, name: 'Theirs', type: 'savings', openingBalance: 0 })!;
    await expect(extract(new ScriptedProvider(EXTRACTION), userId, foreign.id)).rejects.toThrow(/Forbidden/);
  });

  it('flags rows already in the ledger and allows approving them explicitly', async () => {
    finance.createTransaction({ userId, accountId, type: 'expense', amount: 45000, date: '2026-05-02', merchantName: 'SWIGGY ORDER' });
    const service = new AiImportService(new ScriptedProvider(EXTRACTION), db, now);
    const batch = await service.extract(userId, { accountId, kind: 'statement', source: { format: 'text', text: SOURCE } });
    expect(batch.rows[0].reasons.map(r => r.code)).toEqual(['duplicate_in_ledger']);
    expect(batch.rows[0].approvable).toBe(true);

    const skipped = service.setRowExcluded(userId, batch.rows[0].id, 'skip');
    // Skipped rows still count towards reconciliation
    expect(skipped.reconciliation.status).toBe('balanced');
    expect(skipped.rows[0].status).toBe('skipped');
  });
});
