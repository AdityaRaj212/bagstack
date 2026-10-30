import type { DatabaseSync } from 'node:sqlite';
import type { LlmProvider } from './provider';
import { AnthropicProvider } from './anthropic-provider';
import { GeminiProvider } from './gemini-provider';
import { OfflineProvider } from './offline-provider';
import { ResilientProvider, sqliteUsageLogger } from './resilient-provider';

export type ProviderName = 'gemini' | 'anthropic' | 'offline';

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  gemini: 'gemini-3.8-flash',
  anthropic: 'claude-opus-5-5',
  offline: 'offline',
};

/**
 * Picks the provider from env. AI_PROVIDER=gemini|anthropic|offline; when unset,
 * the first provider with a key wins (Gemini's free tier first), otherwise the
 * offline rule-based provider so demo mode and CI work with no key.
 */
export function resolveProviderName(): ProviderName {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === 'gemini' || explicit === 'anthropic' || explicit === 'offline') return explicit;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'offline';
}

export function resolveModel(provider: ProviderName = resolveProviderName()): string {
  return provider === 'offline' ? 'offline' : process.env.AI_MODEL || DEFAULT_MODELS[provider];
}

export function buildBaseProvider(provider: ProviderName = resolveProviderName()): LlmProvider {
  if (provider === 'gemini') return new GeminiProvider(resolveModel(provider));
  if (provider === 'anthropic') return new AnthropicProvider(resolveModel(provider));
  return new OfflineProvider();
}

export function createProvider(db: DatabaseSync, userId: string | null): LlmProvider {
  const provider = resolveProviderName();
  return new ResilientProvider(buildBaseProvider(provider), {
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 60_000,
    maxRetries: process.env.AI_MAX_RETRIES !== undefined ? Number(process.env.AI_MAX_RETRIES) : 2,
    userId,
    logger: sqliteUsageLogger(db),
    // Gemini's free tier costs nothing; set GEMINI_PAID_TIER=true to log list-price cost
    freeTier: provider === 'gemini' && process.env.GEMINI_PAID_TIER !== 'true',
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
