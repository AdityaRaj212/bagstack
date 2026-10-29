import { parseCsvContent } from '../csv-importer';
import {
  LlmProvider,
  ProviderError,
  ProviderResult,
  StructuredRequest,
  ToolCall,
  ToolChoiceRequest,
} from './provider';
import type { Extraction, ExtractedRow, Categorization } from './schemas';

/**
 * Rule-based stand-in for an LLM, implementing the same adapter contract.
 *
 * Used when no API key is configured (demo sandbox, CI) and as the baseline the
 * eval compares real models against. Its output goes through exactly the same
 * deterministic validation as a model's would.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DATE_PATTERN = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[ -](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ ,-]*\d{2,4})\b/i;
const AMOUNT_PATTERN = /\d[\d,]*\.\d{2}\b/g;

export function normalizeLooseDate(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/,/g, '');
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = s.match(/^(\d{1,2})[ -]([a-z]{3})[a-z]*[ -]+(\d{2,4})$/);
  if (m) {
    const month = MONTHS.indexOf(m[2]) + 1;
    if (month === 0) return null;
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function cleanAmount(raw: string): string {
  return raw.replace(/[^\d.,-]/g, '').replace(/,/g, '').replace(/^-/, '');
}

function findLabelledAmount(text: string, label: RegExp): string | null {
  for (const line of text.split(/\r?\n/)) {
    if (label.test(line)) {
      const amounts = line.match(AMOUNT_PATTERN);
      if (amounts) return cleanAmount(amounts[amounts.length - 1]);
    }
  }
  return null;
}

function findPeriod(text: string): { start: string | null; end: string | null } {
  const line = text.split(/\r?\n/).find(l => /statement period|for the period|period:/i.test(l) && DATE_PATTERN.test(l));
  if (!line) return { start: null, end: null };
  const dates = [...line.matchAll(new RegExp(DATE_PATTERN.source, 'gi'))].map(m => normalizeLooseDate(m[0]));
  return { start: dates[0] ?? null, end: dates[1] ?? null };
}

function extractFromCsv(text: string): ExtractedRow[] | null {
  const { headers, rows } = parseCsvContent(text);
  if (headers.length < 3) return null;
  const lower = headers.map(h => h.toLowerCase());
  const find = (...needles: string[]) => headers[lower.findIndex(h => needles.some(n => h.includes(n)))];
  const dateCol = find('date');
  const descCol = find('narration', 'description', 'particulars', 'details', 'merchant', 'remarks');
  if (!dateCol || !descCol) return null;
  const debitCol = find('withdrawal', 'debit');
  const creditCol = find('deposit', 'credit');
  const amountCol = find('amount');
  const typeCol = find('dr/cr', 'type', 'cr/dr');
  const balanceCol = find('balance', 'bal');

  const out: ExtractedRow[] = [];
  for (const row of rows) {
    const date = normalizeLooseDate(row[dateCol] || '');
    if (!date) continue;
    let amount = '';
    let direction: 'debit' | 'credit' = 'debit';
    if (debitCol && creditCol && debitCol !== creditCol) {
      const d = cleanAmount(row[debitCol] || '');
      const c = cleanAmount(row[creditCol] || '');
      if (c && Number(c.replace('.', '')) > 0) {
        amount = c;
        direction = 'credit';
      } else {
        amount = d;
      }
    } else if (amountCol) {
      const rawAmt = row[amountCol] || '';
      amount = cleanAmount(rawAmt);
      const marker = (typeCol ? row[typeCol] || '' : rawAmt).toLowerCase();
      if (/\bcr\b|credit/.test(marker)) direction = 'credit';
      else if (/\bdr\b|debit/.test(marker)) direction = 'debit';
      else direction = rawAmt.trim().startsWith('-') ? 'debit' : 'credit';
    }
    if (!amount) continue;
    out.push({
      date,
      amount,
      merchant: (row[descCol] || '').trim(),
      direction,
      balance_after: balanceCol && row[balanceCol] ? cleanAmount(row[balanceCol]) : null,
    });
  }
  return out;
}

/**
 * Fixed-width text (as produced by PDF-to-text). Uses the header line's column
 * positions to decide whether an amount sits under Withdrawal or Deposit.
 */
function extractFromText(text: string): ExtractedRow[] {
  const lines = text.split(/\r?\n/);
  const header = lines.find(l => /withdraw|debit/i.test(l) && /deposit|credit/i.test(l));
  const columnEnd = (re: RegExp) => {
    const m = header?.match(re);
    return m && m.index !== undefined ? m.index + m[0].length : -1;
  };
  const debitEnd = columnEnd(/withdrawals?|debits?/i);
  const creditEnd = columnEnd(/deposits?|credits?/i);

  const out: ExtractedRow[] = [];
  for (const line of lines) {
    const dm = line.match(DATE_PATTERN);
    if (!dm || dm.index === undefined || dm.index > 4) continue;
    if (/opening|closing|period|statement/i.test(line)) continue;
    const date = normalizeLooseDate(dm[0]);
    if (!date) continue;

    const amounts = [...line.matchAll(AMOUNT_PATTERN)];
    if (amounts.length === 0) continue;
    const firstAmountIdx = amounts[0].index ?? line.length;
    const merchant = line.slice(dm.index + dm[0].length, firstAmountIdx).replace(/\s{2,}/g, ' ').trim();

    let balance: string | null = null;
    let txn = amounts[0];
    if (amounts.length >= 2) {
      balance = cleanAmount(amounts[amounts.length - 1][0]);
      txn = amounts[amounts.length - 2];
    }
    let direction: 'debit' | 'credit' = 'debit';
    const tail = line.slice((txn.index ?? 0) + txn[0].length).toLowerCase();
    if (/^\s*cr\b/.test(tail)) direction = 'credit';
    else if (/^\s*dr\b/.test(tail)) direction = 'debit';
    else if (debitEnd >= 0 && creditEnd >= 0) {
      // Amounts are right-aligned under their column heading
      const end = (txn.index ?? 0) + txn[0].length;
      direction = Math.abs(end - creditEnd) < Math.abs(end - debitEnd) ? 'credit' : 'debit';
    }
    out.push({ date, amount: cleanAmount(txn[0]), merchant, direction, balance_after: balance });
  }
  return out;
}

function extractReceipt(text: string): Extraction {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const merchant = lines[0] ?? '';
  const dateLine = lines.find(l => DATE_PATTERN.test(l));
  const date = dateLine ? normalizeLooseDate(dateLine.match(DATE_PATTERN)![0]) : null;
  const total =
    findLabelledAmount(text, /grand total|amount paid|net payable|total amount/i) ??
    findLabelledAmount(text, /^\s*total\b/i);
  return {
    document_type: 'receipt',
    currency: /\$|usd/i.test(text) ? 'USD' : 'INR',
    period_start: null,
    period_end: null,
    opening_balance: null,
    closing_balance: null,
    stated_total: total,
    rows: total && date ? [{ date, amount: total, merchant, direction: 'debit', balance_after: null }] : [],
  };
}

export function heuristicExtract(text: string, kind: 'statement' | 'receipt'): Extraction {
  if (kind === 'receipt') return extractReceipt(text);
  const period = findPeriod(text);
  const csvRows = extractFromCsv(text);
  const rows = csvRows && csvRows.length > 0 ? csvRows : extractFromText(text);
  return {
    document_type: 'statement',
    currency: 'INR',
    period_start: period.start,
    period_end: period.end,
    opening_balance: findLabelledAmount(text, /opening\s+bal/i),
    closing_balance: findLabelledAmount(text, /closing\s+bal/i),
    stated_total: null,
    rows,
  };
}

// --- Categorisation --------------------------------------------------------

const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/swiggy|zomato|eatsure/i, 'food delivery'],
  [/bigbasket|dmart|blinkit|zepto|grocer|nature.?s basket|reliance fresh|more retail/i, 'groceries'],
  [/starbucks|cafe|coffee|chai|third wave|blue tokai/i, 'coffee'],
  [/restaurant|barbeque|dhaba|biryani|kitchen|diner|pizza/i, 'restaurants'],
  [/uber|ola|rapido|meru/i, 'cab'],
  [/petrol|fuel|hpcl|iocl|bpcl|indian oil|shell/i, 'fuel'],
  [/metro|irctc|railway|bmtc|best bus/i, 'public transit'],
  [/\brent\b|nobroker|landlord/i, 'rent'],
  [/electricity|bescom|tata power|adani elec|msedcl|gas|indane/i, 'electricity'],
  [/airtel|jio|act fibernet|broadband|vodafone|\bvi\b|bsnl/i, 'internet'],
  [/myntra|ajio|zara|h&m|uniqlo|westside/i, 'clothing'],
  [/croma|reliance digital|apple|vijay sales/i, 'electronics'],
  [/amazon|flipkart|ikea|pepperfry/i, 'home essentials'],
  [/netflix|spotify|hotstar|prime video|youtube premium/i, 'streaming'],
  [/pvr|inox|bookmyshow|cinepolis/i, 'movies'],
  [/steam|playstation|google play/i, 'games'],
  [/pharma|apollo|1mg|medplus|netmeds|chemist/i, 'medicines'],
  [/hospital|clinic|diagnostic|lab\b|dr\./i, 'doctor'],
  [/gym|cult\.?fit|fitness/i, 'gym'],
  [/\bemi\b|loan/i, 'loan emi'],
  [/charges|\bfee\b|penalty|sms alert/i, 'bank charges'],
  [/insurance|\blic\b|policy|hdfc ergo|icici lombard/i, 'insurance'],
  [/\btax\b|tds|gst payment/i, 'taxes'],
  [/\bsip\b|mutual fund|zerodha|groww|kuvera/i, 'investments'],
  [/salary|payroll/i, 'full-time salary'],
  [/bonus|incentive/i, 'bonus'],
  [/freelance|upwork|consult/i, 'freelance'],
  [/interest|int\.pd|int pd/i, 'interest income'],
  [/dividend/i, 'dividends'],
  [/refund|cashback|reversal/i, 'refunds'],
];

interface CategorizeInput {
  categories: Array<{ id: string; name: string; type: string }>;
  rows: Array<{ index: number; merchant: string; direction: 'debit' | 'credit' }>;
}

export function heuristicCategorize(input: CategorizeInput): Categorization {
  return {
    assignments: input.rows.map(row => {
      const wantType = row.direction === 'credit' ? 'income' : 'expense';
      for (const [pattern, needle] of CATEGORY_KEYWORDS) {
        if (!pattern.test(row.merchant)) continue;
        const cat = input.categories.find(c => c.type === wantType && c.name.toLowerCase().includes(needle));
        if (cat) return { index: row.index, category_id: cat.id };
      }
      return { index: row.index, category_id: null };
    }),
  };
}

// --- Query routing ---------------------------------------------------------

const CATEGORY_SYNONYMS: Array<[RegExp, string]> = [
  [/\bfood|dining|eating out\b/i, 'food & dining'],
  [/\bgrocer/i, 'groceries'],
  [/\btransport|travel|commut/i, 'transportation'],
  [/\bcab|taxi|uber|ola\b/i, 'cab & auto'],
  [/\bfuel|petrol\b/i, 'fuel'],
  [/\bshopping\b/i, 'shopping & electronics'],
  [/\bentertainment|movies|fun\b/i, 'entertainment & leisure'],
  [/\bhealth|medical\b/i, 'health & wellness'],
  [/\brent\b/i, 'rent'],
  [/\butilit|bills?\b/i, 'housing & utilities'],
  [/\bsalary\b/i, 'salary & professional'],
  [/\bstreaming|subscriptions?\b/i, 'streaming services'],
];

function detectPeriod(q: string): Record<string, unknown> {
  const lower = q.toLowerCase();
  const presets: Array<[RegExp, string]> = [
    [/last month|previous month/, 'last_month'],
    [/this month|so far this month|current month/, 'this_month'],
    [/last year|previous year/, 'last_year'],
    [/this year|year to date|ytd/, 'this_year'],
    [/last 7 days|past week|last week/, 'last_7_days'],
    [/last 30 days|past 30 days|past month/, 'last_30_days'],
    [/last 90 days|last 3 months|past 3 months|last quarter/, 'last_90_days'],
  ];
  for (const [re, preset] of presets) if (re.test(lower)) return { preset, start_date: null, end_date: null };
  const monthIdx = MONTHS.findIndex(m => new RegExp(`\\b${m}[a-z]*\\b`).test(lower));
  if (monthIdx >= 0) {
    const year = lower.match(/\b(20\d{2})\b/)?.[1];
    const mm = String(monthIdx + 1).padStart(2, '0');
    if (year) {
      const last = new Date(Date.UTC(Number(year), monthIdx + 1, 0)).getUTCDate();
      return { preset: 'custom', start_date: `${year}-${mm}-01`, end_date: `${year}-${mm}-${last}` };
    }
  }
  return { preset: 'all_time', start_date: null, end_date: null };
}

function enumOf(tool: ToolChoiceRequest['tools'][number] | undefined, prop: string): string[] {
  const schema = (tool?.inputSchema as any)?.properties?.[prop];
  const variants: any[] = schema?.anyOf ?? [schema];
  return variants.flatMap(v => v?.enum ?? []).filter((x: unknown) => typeof x === 'string');
}

export function heuristicRoute(question: string, tools: ToolChoiceRequest['tools']): ToolCall | null {
  const q = question.toLowerCase();
  const byName = (n: string) => tools.find(t => t.name === n);
  const categoryNames = enumOf(byName('total_spending'), 'category');
  let category: string | null = null;
  for (const [re, target] of CATEGORY_SYNONYMS) {
    if (re.test(q)) {
      category = categoryNames.find(c => c.toLowerCase() === target) ?? null;
      if (category) break;
    }
  }
  const period = detectPeriod(q);
  const merchantMatch = question.match(/\b(?:at|on|from) ([A-Z][\w&.]+(?: [A-Z][\w&.]+)*)/);
  const merchant = merchantMatch && !/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(merchantMatch[1]) ? merchantMatch[1] : null;
  const limitMatch = q.match(/\btop (\d+)|\blast (\d+) transactions/);
  const limit = limitMatch ? Number(limitMatch[1] ?? limitMatch[2]) : null;

  // Every tool is read-only; requests to change data are declined rather than mapped to a lookup
  if (/^\s*(?:please\s+)?(?:delete|remove|add|create|update|change|edit|transfer|move|pay|cancel)\b/m.test(q)) return null;
  if (/balance|how much (?:money )?do i have/.test(q)) return { name: 'account_balances', input: {} };
  if (/compare|vs\.?|versus|than/.test(q)) {
    return {
      name: 'compare_spending',
      input: { period_a: { preset: 'this_month', start_date: null, end_date: null }, period_b: { preset: 'last_month', start_date: null, end_date: null }, category },
    };
  }
  if (/average|per month|monthly average/.test(q)) {
    const months = Number(q.match(/(\d+) months/)?.[1] ?? 6);
    return { name: 'average_monthly_spending', input: { months, category } };
  }
  if (/merchant|where .* most|top (?:\d+ )?(?:places|shops|stores)/.test(q)) return { name: 'top_merchants', input: { period, limit } };
  if (/breakdown|by category|categories|what .* spend .* on\b/.test(q)) return { name: 'spending_by_category', input: { period, limit } };
  if (/show|list|recent|transactions/.test(q)) {
    return { name: 'list_transactions', input: { period, category, merchant, direction: /income|credit/.test(q) ? 'credit' : null, limit } };
  }
  if (/earn|income|salary|receive|got paid/.test(q)) return { name: 'total_income', input: { period, category } };
  if (/spen[dt]|cost|pay|paid|expense/.test(q)) return { name: 'total_spending', input: { period, category, merchant } };
  return null;
}

// --- Provider --------------------------------------------------------------

export class OfflineProvider implements LlmProvider {
  readonly name = 'offline';
  readonly model = 'offline';
  readonly supportsBinaryInput = false;

  async generateStructured<T>(req: StructuredRequest<T>): Promise<ProviderResult<T>> {
    const text = req.content.filter(p => p.type === 'text').map(p => (p as { text: string }).text).join('\n');
    if (req.content.some(p => p.type !== 'text')) {
      throw new ProviderError('The offline provider can only read text documents. Configure ANTHROPIC_API_KEY for PDFs and images.', false);
    }
    let data: unknown;
    if (req.task === 'extract') {
      const kind = /^Document type: receipt/m.test(text) ? 'receipt' : 'statement';
      const body = text.split(/^--- DOCUMENT START ---$/m)[1]?.split(/^--- DOCUMENT END ---$/m)[0] ?? text;
      data = heuristicExtract(body, kind);
    } else if (req.task === 'categorize') {
      data = heuristicCategorize(JSON.parse(text) as CategorizeInput);
    } else {
      throw new ProviderError(`Offline provider does not support structured task ${req.task}`, false);
    }
    return { data: req.schema.parse(data), usage: { inputTokens: 0, outputTokens: 0 }, model: this.model };
  }

  async chooseTool(req: ToolChoiceRequest): Promise<ProviderResult<ToolCall | null>> {
    return { data: heuristicRoute(req.question, req.tools), usage: { inputTokens: 0, outputTokens: 0 }, model: this.model };
  }
}
