import { ApiError, FunctionCallingConfigMode, GoogleGenAI, ThinkingLevel, type Part } from '@google/genai';
import { z } from 'zod';
import {
  AiTask,
  ContentPart,
  LlmProvider,
  ProviderError,
  ProviderResult,
  StructuredRequest,
  ToolCall,
  ToolChoiceRequest,
} from './provider';

/**
 * Google Gemini adapter (free tier capable). Same contract as the Anthropic
 * adapter: schema-constrained JSON for extraction/categorisation and a single
 * function call for query routing. Output is re-parsed with zod either way.
 */

// Mirrors the Anthropic effort split: think harder only where accuracy matters.
const THINKING_BY_TASK: Record<AiTask, ThinkingLevel> = {
  extract: ThinkingLevel.MEDIUM,
  categorize: ThinkingLevel.LOW,
  query: ThinkingLevel.LOW,
};

// Finish reasons that mean the content was withheld; retrying the same input won't help.
const BLOCKED_REASONS = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'LANGUAGE']);

export type GeminiClient = Pick<GoogleGenAI, 'models'>;

function toParts(parts: ContentPart[]): Part[] {
  return parts.map(p => {
    if (p.type === 'text') return { text: p.text };
    if (p.type === 'image') return { inlineData: { mimeType: p.mediaType, data: p.base64 } };
    return { inlineData: { mimeType: 'application/pdf', data: p.base64 } };
  });
}

const DROPPED_KEYWORDS = new Set(['$schema', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum']);

/**
 * Rewrites a JSON Schema into the subset Gemini documents for constrained
 * decoding: nullable fields become type arrays (["string", "null"]) instead of
 * anyOf-with-null, and numeric bounds are dropped (they inflate the decoding
 * state space; executors clamp ranges in code). Output is still zod-validated.
 */
export function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== 'object') return node;
  const obj = node as Record<string, unknown>;

  const variants = obj.anyOf;
  if (Array.isArray(variants) && variants.length === 2) {
    const nonNull = variants.find(v => (v as any)?.type !== 'null') as Record<string, unknown> | undefined;
    const hasNull = variants.some(v => (v as any)?.type === 'null');
    if (hasNull && nonNull && typeof nonNull.type === 'string' && !nonNull.anyOf) {
      const { anyOf: _variants, ...rest } = obj;
      const merged: Record<string, unknown> = { ...(toGeminiSchema(nonNull) as Record<string, unknown>), ...(toGeminiSchema(rest) as Record<string, unknown>) };
      merged.type = [nonNull.type, 'null'];
      if (Array.isArray(merged.enum)) merged.enum = [...merged.enum, null];
      return merged;
    }
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (DROPPED_KEYWORDS.has(k)) continue;
    out[k] = toGeminiSchema(v);
  }
  return out;
}

function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  return toGeminiSchema(z.toJSONSchema(schema)) as Record<string, unknown>;
}

/** Free-tier 429s carry a server-suggested delay ("retryDelay": "17s"); honour it. */
function retryDelayMs(message: string): number | undefined {
  const m = message.match(/retry(?:Delay)?["\s:]+(?:in\s+)?"?(\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(Number(m[1]) * 1000) : undefined;
}

function mapError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof ApiError) {
    const status = err.status;
    const retryable = status === 408 || status === 429 || status >= 500;
    return new ProviderError(err.message, retryable, status, status === 429 ? retryDelayMs(err.message) : undefined);
  }
  if (err instanceof Error && err.name === 'AbortError') return new ProviderError('Request aborted (timeout)', true);
  // fetch-level failures (DNS, reset) surface as TypeError
  if (err instanceof TypeError) return new ProviderError(err.message, true);
  return new ProviderError(err instanceof Error ? err.message : String(err), false);
}

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  readonly supportsBinaryInput = true;
  private readonly client: GeminiClient;

  constructor(readonly model: string = 'gemini-3.8-flash', client?: GeminiClient) {
    this.client = client ?? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  private usageOf(res: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } }) {
    const u = res.usageMetadata ?? {};
    // Gemini bills thinking tokens as output
    return { inputTokens: u.promptTokenCount ?? 0, outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) };
  }

  private checkFinish(res: { candidates?: Array<{ finishReason?: string }>; promptFeedback?: { blockReason?: string } }) {
    if (res.promptFeedback?.blockReason) throw new ProviderError(`Gemini blocked the input (${res.promptFeedback.blockReason})`, false);
    const reason = res.candidates?.[0]?.finishReason;
    if (reason === 'MAX_TOKENS') throw new ProviderError('Model output was truncated (max tokens)', false);
    if (reason && BLOCKED_REASONS.has(reason)) throw new ProviderError(`Gemini withheld the output (${reason})`, false);
  }

  async generateStructured<T>(req: StructuredRequest<T>): Promise<ProviderResult<T>> {
    try {
      const res = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: toParts(req.content) }],
        config: {
          systemInstruction: req.system,
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchemaOf(req.schema),
          maxOutputTokens: 32_000,
          thinkingConfig: { thinkingLevel: THINKING_BY_TASK[req.task] },
          abortSignal: req.signal,
        },
      });
      this.checkFinish(res);

      let parsed: unknown;
      try {
        parsed = JSON.parse(res.text ?? '');
      } catch {
        throw new ProviderError('Model output was not valid JSON', true);
      }
      const checked = req.schema.safeParse(parsed);
      if (!checked.success) throw new ProviderError('Model output did not match the schema', true);
      return { data: checked.data, usage: this.usageOf(res), model: this.model };
    } catch (err) {
      throw mapError(err);
    }
  }

  async chooseTool(req: ToolChoiceRequest): Promise<ProviderResult<ToolCall | null>> {
    try {
      const res = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: req.question }] }],
        config: {
          systemInstruction: req.system,
          tools: [
            {
              functionDeclarations: req.tools.map(t => ({
                name: t.name,
                description: t.description,
                parametersJsonSchema: toGeminiSchema(t.inputSchema),
              })),
            },
          ],
          // AUTO, not ANY: the model must be able to decline write requests and off-topic questions
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
          thinkingConfig: { thinkingLevel: THINKING_BY_TASK[req.task] },
          abortSignal: req.signal,
        },
      });
      this.checkFinish(res);
      const call = res.functionCalls?.[0];
      return {
        data: call?.name ? { name: call.name, input: call.args ?? {} } : null,
        usage: this.usageOf(res),
        model: this.model,
      };
    } catch (err) {
      throw mapError(err);
    }
  }
}
