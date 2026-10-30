import type { DatabaseSync } from 'node:sqlite';
import {
  LlmProvider,
  ProviderError,
  ProviderResult,
  StructuredRequest,
  ToolCall,
  ToolChoiceRequest,
  AiTask,
  Usage,
} from './provider';

/**
 * Paid list prices in integer micro-USD per 1M tokens. Unknown models are
 * logged at zero cost rather than guessed.
 */
const PRICE_MICRO_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4_000_000, output: 20_000_000 },
  'claude-sonnet-5-5': { input: 2_000_000, output: 10_000_000 },
  'gemini-3.8-flash': { input: 750_000, output: 3_750_000 },
  'gemini-3.6-flash': { input: 750_000, output: 3_750_000 },
  'gemini-3.5-flash-lite': { input: 300_000, output: 2_500_000 },
  offline: { input: 0, output: 0 },
};

/** Cost at paid list price, rounded to whole micro-USD. */
export function costMicroUsd(model: string, usage: Usage): number {
  const price = PRICE_MICRO_USD_PER_MTOK[model];
  if (!price) return 0;
  return Math.round((usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000);
}

export interface UsageLogEntry {
  userId: string | null;
  provider: string;
  model: string;
  task: AiTask;
  usage: Usage;
  costMicroUsd: number;
  latencyMs: number;
  attempts: number;
  status: 'ok' | 'error';
  error?: string;
}

export type UsageLogger = (entry: UsageLogEntry) => void;

export function sqliteUsageLogger(db: DatabaseSync): UsageLogger {
  const stmt = db.prepare(`
    INSERT INTO ai_usage_log (id, user_id, provider, model, task, input_tokens, output_tokens, cost_micro_usd, latency_ms, attempts, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return entry => {
    try {
      stmt.run(
        `ailog_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        entry.userId,
        entry.provider,
        entry.model,
        entry.task,
        entry.usage.inputTokens,
        entry.usage.outputTokens,
        entry.costMicroUsd,
        entry.latencyMs,
        entry.attempts,
        entry.status,
        entry.error ?? null
      );
    } catch (err) {
      // Logging must never break the request path
      console.warn('[AI] Failed to write usage log:', err);
    }
  };
}

export interface ResilienceOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  userId?: string | null;
  logger?: UsageLogger;
  sleep?: (ms: number) => Promise<void>;
  /** Free-tier usage is logged at $0 (tokens are still recorded). */
  freeTier?: boolean;
  /** Upper bound on a server-suggested retry wait. */
  maxRetryAfterMs?: number;
}

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Wraps any provider with a per-attempt timeout, bounded exponential backoff on
 * retryable failures, and a usage/cost log row per logical call.
 */
export class ResilientProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsBinaryInput: boolean;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly inner: LlmProvider, private readonly opts: ResilienceOptions = {}) {
    this.name = inner.name;
    this.model = inner.model;
    this.supportsBinaryInput = inner.supportsBinaryInput;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.maxRetries = opts.maxRetries ?? 2;
    this.baseBackoffMs = opts.baseBackoffMs ?? 500;
    this.sleep = opts.sleep ?? defaultSleep;
  }

  generateStructured<T>(req: StructuredRequest<T>): Promise<ProviderResult<T>> {
    return this.run(req.task, signal => this.inner.generateStructured({ ...req, signal }));
  }

  chooseTool(req: ToolChoiceRequest): Promise<ProviderResult<ToolCall | null>> {
    return this.run(req.task, signal => this.inner.chooseTool({ ...req, signal }));
  }

  private async run<R>(task: AiTask, call: (signal: AbortSignal) => Promise<ProviderResult<R>>): Promise<ProviderResult<R>> {
    const started = Date.now();
    let attempts = 0;
    let lastError: unknown;
    const total: Usage = { inputTokens: 0, outputTokens: 0 };

    while (attempts <= this.maxRetries) {
      attempts++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const result = await Promise.race([
          call(controller.signal),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () =>
              reject(new ProviderError(`Timed out after ${this.timeoutMs}ms`, true))
            );
          }),
        ]);
        total.inputTokens += result.usage.inputTokens;
        total.outputTokens += result.usage.outputTokens;
        this.log(task, result.model, total, started, attempts, 'ok');
        return result;
      } catch (err) {
        lastError = err;
        const retryable = err instanceof ProviderError ? err.retryable : false;
        if (!retryable || attempts > this.maxRetries) break;
        const backoff = this.baseBackoffMs * 2 ** (attempts - 1) + Math.floor(Math.random() * this.baseBackoffMs);
        const suggested = err instanceof ProviderError && err.retryAfterMs ? Math.min(err.retryAfterMs, this.opts.maxRetryAfterMs ?? 60_000) : 0;
        await this.sleep(Math.max(backoff, suggested));
      } finally {
        clearTimeout(timer);
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    this.log(task, this.model, total, started, attempts, 'error', message);
    throw lastError instanceof ProviderError ? lastError : new ProviderError(message, false);
  }

  private log(task: AiTask, model: string, usage: Usage, started: number, attempts: number, status: 'ok' | 'error', error?: string) {
    this.opts.logger?.({
      userId: this.opts.userId ?? null,
      provider: this.name,
      model,
      task,
      usage,
      costMicroUsd: this.opts.freeTier ? 0 : costMicroUsd(model, usage),
      latencyMs: Date.now() - started,
      attempts,
      status,
      error,
    });
  }
}
