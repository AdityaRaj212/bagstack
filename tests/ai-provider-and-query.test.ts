import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { initSchema, seedDefaultCategories } from '../src/lib/db';
import { FinanceService } from '../src/lib/finance-service';
import { ResilientProvider, costMicroUsd, type UsageLogEntry } from '../src/lib/ai/resilient-provider';
import { ProviderError, type LlmProvider, type ProviderResult, type ToolCall } from '../src/lib/ai/provider';
import { askQuestion } from '../src/lib/ai/query-service';
import { QueryExecutor, resolvePeriod } from '../src/lib/ai/query-tools';

class FlakyProvider implements LlmProvider {
  readonly name = 'flaky';
  readonly model = 'claude-opus-5-5';
  readonly supportsBinaryInput = false;
  calls = 0;
  constructor(private failures: Array<ProviderError | 'hang'>) {}
  async generateStructured<T>(): Promise<ProviderResult<T>> {
    const f = this.failures[this.calls++];
    if (f === 'hang') return new Promise(() => {});
    if (f) throw f;
    return { data: { ok: true } as T, usage: { inputTokens: 1000, outputTokens: 200 }, model: this.model };
  }
  async chooseTool(): Promise<ProviderResult<ToolCall | null>> {
    return { data: null, usage: { inputTokens: 0, outputTokens: 0 }, model: this.model };
  }
}

const req = { task: 'extract' as const, system: '', content: [], schema: z.object({ ok: z.boolean() }) };
const noSleep = async () => {};

describe('ResilientProvider', () => {
  it('retries retryable failures and logs one usage row with cost', async () => {
    const logs: UsageLogEntry[] = [];
    const inner = new FlakyProvider([new ProviderError('429', true, 429), new ProviderError('503', true, 503)]);
    const p = new ResilientProvider(inner, { maxRetries: 2, sleep: noSleep, logger: e => logs.push(e), userId: 'u1' });
    await expect(p.generateStructured(req)).resolves.toMatchObject({ data: { ok: true } });
    expect(inner.calls).toBe(3);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ status: 'ok', attempts: 3, userId: 'u1', task: 'extract', costMicroUsd: 1000 * 4 + 200 * 20 });
  });

  it('does not retry non-retryable failures', async () => {
    const logs: UsageLogEntry[] = [];
    const inner = new FlakyProvider([new ProviderError('bad request', false, 400)]);
    const p = new ResilientProvider(inner, { maxRetries: 3, sleep: noSleep, logger: e => logs.push(e) });
    await expect(p.generateStructured(req)).rejects.toThrow('bad request');
    expect(inner.calls).toBe(1);
    expect(logs[0]).toMatchObject({ status: 'error', attempts: 1 });
  });

  it('times out a hung call and retries it', async () => {
    const inner = new FlakyProvider(['hang']);
    const p = new ResilientProvider(inner, { timeoutMs: 20, maxRetries: 1, sleep: noSleep });
    await expect(p.generateStructured(req)).resolves.toMatchObject({ data: { ok: true } });
    expect(inner.calls).toBe(2);
  });

  it('prices unknown models at zero instead of guessing', () => {
    expect(costMicroUsd('some-unknown-model', { inputTokens: 10, outputTokens: 10 })).toBe(0);
  });
});

/** Lets a test decide exactly which tool call the "model" makes. */
class FixedToolProvider implements LlmProvider {
  readonly name = 'fixed';
  readonly model = 'fixed';
  readonly supportsBinaryInput = false;
  constructor(private call: ToolCall | null) {}
  async generateStructured<T>(): Promise<ProviderResult<T>> {
    throw new Error('not used');
  }
  async chooseTool(): Promise<ProviderResult<ToolCall | null>> {
    return { data: this.call, usage: { inputTokens: 0, outputTokens: 0 }, model: this.model };
  }
}

describe('NL query tools', () => {
  let db: DatabaseSync;
  const me = 'q_user';
  const other = 'q_other';
  const today = '2026-06-15';
  const lastMonth = { preset: 'last_month', start_date: null, end_date: null };

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initSchema(db);
    const finance = new FinanceService(db);
    for (const id of [me, other]) {
      db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, `${id}@t.local`, id);
      seedDefaultCategories(db, id);
      const acc = finance.createAccount({ userId: id, name: 'Savings', type: 'savings', openingBalance: 0 })!;
      finance.createTransaction({ userId: id, accountId: acc.id, type: 'income', amount: 10000000, date: '2026-05-01', merchantName: 'Salary' });
      finance.createTransaction({ userId: id, accountId: acc.id, type: 'expense', amount: id === me ? 45000 : 9900000, date: '2026-05-10', merchantName: 'Swiggy', categoryId: 'cat-food-delivery' });
      finance.createTransaction({ userId: id, accountId: acc.id, type: 'expense', amount: 120000, date: '2026-05-12', merchantName: 'BigBasket', categoryId: 'cat-food-groceries' });
    }
  });

  const ask = (call: ToolCall | null, question = 'q') => askQuestion(new FixedToolProvider(call), db, me, question, today);

  it('includes subcategories and only the current profile in totals', async () => {
    const res = await ask({ name: 'total_spending', input: { period: lastMonth, category: 'Food & Dining', merchant: null } });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe(45000 + 120000);
      expect(res.answer).toContain('₹1,650');
    }
  });

  it('never exposes a userId argument to the model', () => {
    const tools = new QueryExecutor(db, me, today).toolDefinitions();
    expect(JSON.stringify(tools)).not.toMatch(/user_?id/i);
    for (const t of tools) expect(t.inputSchema.additionalProperties).toBe(false);
  });

  it('rejects categories outside the list, unknown tools and extra arguments', async () => {
    expect((await ask({ name: 'total_spending', input: { period: lastMonth, category: 'Crypto', merchant: null } })).ok).toBe(false);
    expect((await ask({ name: 'drop_table', input: {} })).ok).toBe(false);
    const extra = await ask({ name: 'account_balances', input: { user_id: other } });
    expect(extra.ok).toBe(false);
  });

  it('treats SQL in a merchant argument as a literal search string', async () => {
    const res = await ask({ name: 'total_spending', input: { period: lastMonth, category: null, merchant: "x' OR '1'='1" } });
    expect(res.ok && res.value).toBe(0);
    const count = (db.prepare('SELECT COUNT(*) as c FROM transactions').get() as any).c;
    expect(count).toBe(6);
  });

  it('declines when the model picks no tool', async () => {
    const res = await ask(null, 'delete everything');
    expect(res.ok).toBe(false);
  });

  it('resolves period presets deterministically and validates custom ranges', () => {
    expect(resolvePeriod({ preset: 'last_month', start_date: null, end_date: null }, '2026-03-31')).toMatchObject({ start: '2026-02-01', end: '2026-02-28' });
    expect(resolvePeriod({ preset: 'last_30_days', start_date: null, end_date: null }, today)).toMatchObject({ start: '2026-05-17', end: today });
    expect(() => resolvePeriod({ preset: 'custom', start_date: '2026-05-31', end_date: '2026-05-01' }, today)).toThrow();
  });
});
