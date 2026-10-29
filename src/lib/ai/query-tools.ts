import { z } from 'zod';
import type { DatabaseSync } from 'node:sqlite';
import { FinanceService } from '../finance-service';
import { formatMoney } from '../money';
import { formatDateDMY } from '../date';
import type { ToolDefinition } from './provider';
import { isValidIsoDate } from './validation';

/**
 * Fixed set of read-only query functions the model may choose from.
 *
 * The model supplies only arguments. The profile (userId) is bound when the
 * executor is constructed from the authenticated session and is never an
 * argument, so a question cannot reach another profile's data. All SQL is
 * static and parameterised.
 */

export const PERIOD_PRESETS = [
  'this_month',
  'last_month',
  'this_year',
  'last_year',
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'all_time',
  'custom',
] as const;

const PeriodSchema = z.strictObject({
  preset: z.enum(PERIOD_PRESETS),
  start_date: z.string().nullable().describe('YYYY-MM-DD, only with preset "custom"'),
  end_date: z.string().nullable().describe('YYYY-MM-DD inclusive, only with preset "custom"'),
});
export type Period = z.infer<typeof PeriodSchema>;

function buildArgSchemas(categoryNames: [string, ...string[]]) {
  const category = z.enum(categoryNames).nullable().describe('Category name from the list, or null for all categories');
  const limit = z.number().int().nullable().describe('Max rows to return (1-50), null for default');
  return {
    total_spending: z.strictObject({
      period: PeriodSchema,
      category,
      merchant: z.string().nullable().describe('Merchant name fragment, or null'),
    }),
    total_income: z.strictObject({ period: PeriodSchema, category }),
    spending_by_category: z.strictObject({ period: PeriodSchema, limit }),
    top_merchants: z.strictObject({ period: PeriodSchema, limit }),
    account_balances: z.strictObject({}),
    list_transactions: z.strictObject({
      period: PeriodSchema,
      category,
      merchant: z.string().nullable(),
      direction: z.enum(['debit', 'credit']).nullable().describe('debit = spending, credit = income'),
      limit,
    }),
    compare_spending: z.strictObject({ period_a: PeriodSchema, period_b: PeriodSchema, category }),
    average_monthly_spending: z.strictObject({
      months: z.number().int().describe('Number of complete past months to average over (1-24)'),
      category,
    }),
  };
}

export type QueryToolName = keyof ReturnType<typeof buildArgSchemas>;

const DESCRIPTIONS: Record<QueryToolName, string> = {
  total_spending: 'Total amount spent (expenses) in a period, optionally for one category (includes its subcategories) or merchant.',
  total_income: 'Total income received in a period, optionally for one income category.',
  spending_by_category: 'Breakdown of spending by top-level category for a period, largest first.',
  top_merchants: 'Merchants with the highest total spending in a period.',
  account_balances: 'Current balance of every active account and the net total.',
  list_transactions: 'List individual transactions in a period, newest first, with optional filters.',
  compare_spending: 'Compare total spending between two periods, optionally for one category.',
  average_monthly_spending: 'Average monthly spending over the last N complete months, optionally for one category.',
};

export interface QueryResult {
  tool: QueryToolName;
  args: unknown;
  /** Primary numeric answer in minor units (or a count), used for scoring. */
  value: number | null;
  answer: string;
  data: unknown;
}

function isoOf(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function resolvePeriod(p: Period, today: string): { start: string; end: string; label: string } {
  const [y, m, d] = today.split('-').map(Number);
  const utc = (yy: number, mm: number, dd: number) => isoOf(new Date(Date.UTC(yy, mm - 1, dd)));
  const daysBack = (n: number) => utc(y, m, d - (n - 1));
  switch (p.preset) {
    case 'this_month':
      return { start: utc(y, m, 1), end: today, label: 'this month' };
    case 'last_month':
      return { start: utc(y, m - 1, 1), end: utc(y, m, 0), label: 'last month' };
    case 'this_year':
      return { start: `${y}-01-01`, end: today, label: 'this year' };
    case 'last_year':
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31`, label: 'last year' };
    case 'last_7_days':
      return { start: daysBack(7), end: today, label: 'in the last 7 days' };
    case 'last_30_days':
      return { start: daysBack(30), end: today, label: 'in the last 30 days' };
    case 'last_90_days':
      return { start: daysBack(90), end: today, label: 'in the last 90 days' };
    case 'all_time':
      return { start: '0000-01-01', end: '9999-12-31', label: 'in total' };
    case 'custom': {
      if (!p.start_date || !p.end_date || !isValidIsoDate(p.start_date) || !isValidIsoDate(p.end_date) || p.start_date > p.end_date) {
        throw new QueryArgError('Custom period needs valid start_date <= end_date');
      }
      return { start: p.start_date, end: p.end_date, label: `from ${formatDateDMY(p.start_date)} to ${formatDateDMY(p.end_date)}` };
    }
  }
}

export class QueryArgError extends Error {}

/** Strict tool schemas reject numeric bounds; ranges are clamped in the executors instead. */
function stripNumericBounds(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripNumericBounds);
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'minimum' || k === 'maximum' || k === 'exclusiveMinimum' || k === 'exclusiveMaximum') continue;
    out[k] = stripNumericBounds(v);
  }
  return out;
}

export class QueryExecutor {
  private readonly finance: FinanceService;
  private readonly categories: Array<{ id: string; name: string; parent_id: string | null; type: string }>;
  private readonly schemas: ReturnType<typeof buildArgSchemas>;

  constructor(
    private readonly db: DatabaseSync,
    private readonly userId: string,
    private readonly today: string,
    private readonly currency = 'INR'
  ) {
    this.finance = new FinanceService(db);
    this.categories = this.finance.getCategories(userId).categories;
    const names = [...new Set(this.categories.map(c => c.name))];
    this.schemas = buildArgSchemas((names.length ? names : ['Uncategorized']) as [string, ...string[]]);
  }

  toolDefinitions(): ToolDefinition[] {
    return (Object.keys(this.schemas) as QueryToolName[]).map(name => {
      const { $schema: _ignored, ...inputSchema } = stripNumericBounds(z.toJSONSchema(this.schemas[name])) as Record<string, unknown>;
      return { name, description: DESCRIPTIONS[name], inputSchema };
    });
  }

  isTool(name: string): name is QueryToolName {
    return Object.prototype.hasOwnProperty.call(this.schemas, name);
  }

  /** Validates model-supplied arguments and runs the matching read-only query. */
  execute(name: string, rawArgs: unknown): QueryResult {
    if (!this.isTool(name)) throw new QueryArgError(`Unknown tool ${name}`);
    const parsed = this.schemas[name].safeParse(rawArgs);
    if (!parsed.success) throw new QueryArgError(`Invalid arguments for ${name}: ${parsed.error.issues[0]?.message}`);
    const args = parsed.data as any;

    switch (name) {
      case 'total_spending':
        return this.totalByType('expense', name, args);
      case 'total_income':
        return this.totalByType('income', name, args);
      case 'spending_by_category':
        return this.spendingByCategory(args);
      case 'top_merchants':
        return this.topMerchants(args);
      case 'account_balances':
        return this.accountBalances();
      case 'list_transactions':
        return this.listTransactions(args);
      case 'compare_spending':
        return this.compareSpending(args);
      case 'average_monthly_spending':
        return this.averageMonthly(args);
    }
  }

  private money(v: number) {
    return formatMoney(v, this.currency);
  }

  /** Category plus its subcategories, so "Food & Dining" includes "Groceries". */
  private categoryIds(name: string | null): string[] | null {
    if (!name) return null;
    const matches = this.categories.filter(c => c.name === name);
    if (matches.length === 0) throw new QueryArgError(`Unknown category ${name}`);
    const ids = new Set(matches.map(c => c.id));
    for (const c of this.categories) if (c.parent_id && ids.has(c.parent_id)) ids.add(c.id);
    return [...ids];
  }

  private sumExpenses(start: string, end: string, catIds: string[] | null, merchant: string | null, type: 'expense' | 'income' = 'expense') {
    // Static SQL; the optional filters are bound to placeholders, never interpolated.
    const catJson = catIds ? JSON.stringify(catIds) : null;
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND type = ? AND is_deleted = 0 AND date >= ? AND date <= ?
        AND (? IS NULL OR category_id IN (SELECT value FROM json_each(?)))
        AND (? IS NULL OR LOWER(merchant_name) LIKE '%' || LOWER(?) || '%')
    `).get(this.userId, type, start, end, catJson, catJson, merchant, merchant) as { total: number; count: number };
    return row;
  }

  private totalByType(type: 'expense' | 'income', tool: QueryToolName, args: { period: Period; category: string | null; merchant?: string | null }): QueryResult {
    const p = resolvePeriod(args.period, this.today);
    const { total, count } = this.sumExpenses(p.start, p.end, this.categoryIds(args.category), args.merchant ?? null, type);
    const what = `${args.category ? ` on ${args.category}` : ''}${args.merchant ? ` at ${args.merchant}` : ''}`;
    const verb = type === 'expense' ? 'You spent' : 'You received';
    return {
      tool,
      args,
      value: total,
      answer: `${verb} ${this.money(total)}${what} ${p.label} (${count} transaction${count === 1 ? '' : 's'}).`,
      data: { start: p.start, end: p.end, total, count },
    };
  }

  private spendingByCategory(args: { period: Period; limit: number | null }): QueryResult {
    const p = resolvePeriod(args.period, this.today);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const rows = this.db.prepare(`
      SELECT COALESCE(parent.name, c.name, 'Uncategorized') as category, SUM(t.amount) as total
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.is_deleted = 0 AND t.date >= ? AND t.date <= ?
      GROUP BY 1
      ORDER BY total DESC
      LIMIT ?
    `).all(this.userId, p.start, p.end, limit) as Array<{ category: string; total: number }>;
    const top = rows[0];
    return {
      tool: 'spending_by_category',
      args,
      value: top ? top.total : 0,
      answer: rows.length
        ? `Spending by category ${p.label}: ${rows.map(r => `${r.category} ${this.money(r.total)}`).join(', ')}.`
        : `No spending recorded ${p.label}.`,
      data: rows,
    };
  }

  private topMerchants(args: { period: Period; limit: number | null }): QueryResult {
    const p = resolvePeriod(args.period, this.today);
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 50);
    const rows = this.db.prepare(`
      SELECT merchant_name as merchant, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND is_deleted = 0 AND merchant_name IS NOT NULL AND date >= ? AND date <= ?
      GROUP BY merchant_name
      ORDER BY total DESC
      LIMIT ?
    `).all(this.userId, p.start, p.end, limit) as Array<{ merchant: string; total: number; count: number }>;
    return {
      tool: 'top_merchants',
      args,
      value: rows[0]?.total ?? 0,
      answer: rows.length
        ? `Top merchants ${p.label}: ${rows.map(r => `${r.merchant} ${this.money(r.total)}`).join(', ')}.`
        : `No spending recorded ${p.label}.`,
      data: rows,
    };
  }

  private accountBalances(): QueryResult {
    const rows = this.db.prepare(`
      SELECT name, type, current_balance as balance, include_in_net_worth
      FROM accounts WHERE user_id = ? AND archived = 0
      ORDER BY sort_order, name
    `).all(this.userId) as Array<{ name: string; type: string; balance: number; include_in_net_worth: number }>;
    const total = rows.filter(r => r.include_in_net_worth).reduce((acc, r) => acc + r.balance, 0);
    return {
      tool: 'account_balances',
      args: {},
      value: total,
      answer: rows.length
        ? `${rows.map(r => `${r.name}: ${this.money(r.balance)}`).join(', ')}. Net total ${this.money(total)}.`
        : 'You have no accounts yet.',
      data: { accounts: rows, total },
    };
  }

  private listTransactions(args: { period: Period; category: string | null; merchant: string | null; direction: 'debit' | 'credit' | null; limit: number | null }): QueryResult {
    const p = resolvePeriod(args.period, this.today);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const catIds = this.categoryIds(args.category);
    const catJson = catIds ? JSON.stringify(catIds) : null;
    const type = args.direction === 'credit' ? 'income' : args.direction === 'debit' ? 'expense' : null;
    const rows = this.db.prepare(`
      SELECT t.date, t.merchant_name as merchant, t.amount, t.type, c.name as category
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ? AND t.is_deleted = 0 AND t.type IN ('expense', 'income') AND t.date >= ? AND t.date <= ?
        AND (? IS NULL OR t.type = ?)
        AND (? IS NULL OR t.category_id IN (SELECT value FROM json_each(?)))
        AND (? IS NULL OR LOWER(t.merchant_name) LIKE '%' || LOWER(?) || '%')
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ?
    `).all(this.userId, p.start, p.end, type, type, catJson, catJson, args.merchant, args.merchant, limit) as any[];
    return {
      tool: 'list_transactions',
      args,
      value: rows.length,
      answer: rows.length
        ? `${rows.length} transaction${rows.length === 1 ? '' : 's'} ${p.label}: ${rows
            .map(r => `${r.date} ${r.merchant ?? '—'} ${r.type === 'income' ? '+' : '-'}${this.money(r.amount)}`)
            .join('; ')}.`
        : `No matching transactions ${p.label}.`,
      data: rows,
    };
  }

  private compareSpending(args: { period_a: Period; period_b: Period; category: string | null }): QueryResult {
    const a = resolvePeriod(args.period_a, this.today);
    const b = resolvePeriod(args.period_b, this.today);
    const ids = this.categoryIds(args.category);
    const ta = this.sumExpenses(a.start, a.end, ids, null).total;
    const tb = this.sumExpenses(b.start, b.end, ids, null).total;
    const delta = ta - tb;
    const what = args.category ? ` on ${args.category}` : '';
    return {
      tool: 'compare_spending',
      args,
      value: delta,
      answer: `You spent ${this.money(ta)}${what} ${a.label} vs ${this.money(tb)} ${b.label} (${delta >= 0 ? 'up' : 'down'} ${this.money(Math.abs(delta))}).`,
      data: { a: { ...a, total: ta }, b: { ...b, total: tb }, delta },
    };
  }

  private averageMonthly(args: { months: number; category: string | null }): QueryResult {
    const months = Math.min(Math.max(args.months, 1), 24);
    const [y, m] = this.today.split('-').map(Number);
    const start = isoOf(new Date(Date.UTC(y, m - 1 - months, 1)));
    const end = isoOf(new Date(Date.UTC(y, m - 1, 0)));
    const { total } = this.sumExpenses(start, end, this.categoryIds(args.category), null);
    const avg = Math.round(total / months);
    const what = args.category ? ` on ${args.category}` : '';
    return {
      tool: 'average_monthly_spending',
      args: { ...args, months },
      value: avg,
      answer: `Over the last ${months} complete month${months === 1 ? '' : 's'} (${formatDateDMY(start)} to ${formatDateDMY(end)}) you averaged ${this.money(avg)} per month${what}.`,
      data: { start, end, total, months, average: avg },
    };
  }
}
