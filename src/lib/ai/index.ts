import type { DatabaseSync } from 'node:sqlite';
import type { LlmProvider } from './provider';
import { AnthropicProvider } from './anthropic-provider';
import { OfflineProvider } from './offline-provider';
import { ResilientProvider, sqliteUsageLogger } from './resilient-provider';

/**
 * Picks the provider from env. AI_PROVIDER=anthropic|offline; when unset, the
 * Anthropic adapter is used if an API key is configured, otherwise the offline
 * rule-based provider (so demo mode and CI work with no key).
 */
export function resolveProviderName(): 'anthropic' | 'offline' {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === 'anthropic' || explicit === 'offline') return explicit;
  return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'offline';
}

export function createProvider(db: DatabaseSync, userId: string | null): LlmProvider {
  const inner: LlmProvider =
    resolveProviderName() === 'anthropic'
      ? new AnthropicProvider(process.env.AI_MODEL || 'claude-opus-5-5')
      : new OfflineProvider();
  return new ResilientProvider(inner, {
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 60_000,
    maxRetries: process.env.AI_MAX_RETRIES !== undefined ? Number(process.env.AI_MAX_RETRIES) : 2,
    userId,
    logger: sqliteUsageLogger(db),
  });
}

/**
 * Daily spend guard for the hosted demo. Limits are integer micro-USD.
 * Returns an error message when a limit is exhausted.
 */
export function checkDailyBudget(db: DatabaseSync, userId: string): string | null {
  const perUser = Number(process.env.AI_DAILY_USER_BUDGET_MICRO_USD) || 500_000; // $0.50
  const global = Number(process.env.AI_DAILY_GLOBAL_BUDGET_MICRO_USD) || 10_000_000; // $10
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  const user = db.prepare(`SELECT COALESCE(SUM(cost_micro_usd), 0) as c FROM ai_usage_log WHERE user_id = ? AND created_at >= ?`).get(userId, since) as any;
  if (user.c >= perUser) return 'Daily AI usage limit reached for this profile. Try again tomorrow.';
  const all = db.prepare(`SELECT COALESCE(SUM(cost_micro_usd), 0) as c FROM ai_usage_log WHERE created_at >= ?`).get(since) as any;
  if (all.c >= global) return 'The AI assistant has hit its daily budget. Try again tomorrow.';
  return null;
}

export { AiImportService } from './import-service';
export { askQuestion } from './query-service';
