import type { z } from 'zod';

/**
 * Provider adapter contract.
 *
 * Every model vendor implements two primitives: structured generation (JSON that
 * matches a zod schema) and single tool selection. Nothing a provider returns is
 * trusted: callers re-validate outputs with zod before acting on them.
 */

export type AiTask = 'extract' | 'categorize' | 'query';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; base64: string }
  | { type: 'pdf'; base64: string };

export interface StructuredRequest<T> {
  task: AiTask;
  system: string;
  content: ContentPart[];
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema, additionalProperties: false
}

export interface ToolChoiceRequest {
  task: AiTask;
  system: string;
  question: string;
  tools: ToolDefinition[];
  signal?: AbortSignal;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderResult<T> {
  data: T;
  usage: Usage;
  model: string;
}

export interface ToolCall {
  name: string;
  input: unknown;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsBinaryInput: boolean;
  generateStructured<T>(req: StructuredRequest<T>): Promise<ProviderResult<T>>;
  chooseTool(req: ToolChoiceRequest): Promise<ProviderResult<ToolCall | null>>;
}

/**
 * Normalised failure so the resilience layer can decide whether to retry
 * without knowing vendor-specific error classes.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    /** Server-suggested wait before retrying (e.g. free-tier quota resets). */
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
