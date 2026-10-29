import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import {
  ContentPart,
  LlmProvider,
  ProviderError,
  ProviderResult,
  StructuredRequest,
  ToolCall,
  ToolChoiceRequest,
  AiTask,
} from './provider';

type Effort = 'low' | 'medium' | 'high';

// Extraction is the accuracy-sensitive task; routing and categorisation are simple classification.
const EFFORT_BY_TASK: Record<AiTask, Effort> = {
  extract: 'medium',
  categorize: 'low',
  query: 'low',
};

// Server-side fallback re-runs a refused request on another model inside the same call.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

function toBlocks(parts: ContentPart[]): Anthropic.Beta.BetaContentBlockParam[] {
  return parts.map(part => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    if (part.type === 'image') {
      return { type: 'image', source: { type: 'base64', media_type: part.mediaType, data: part.base64 } };
    }
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: part.base64 } };
  });
}

function mapError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return new ProviderError('Request aborted (timeout)', true);
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError(err.message, true);
  if (err instanceof Anthropic.RateLimitError) return new ProviderError(err.message, true, 429);
  if (err instanceof Anthropic.InternalServerError) return new ProviderError(err.message, true, err.status);
  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    const retryable = status === 408 || status === 409 || (typeof status === 'number' && status >= 500);
    return new ProviderError(err.message, retryable, status);
  }
  return new ProviderError(err instanceof Error ? err.message : String(err), false);
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly supportsBinaryInput = true;
  private readonly client: Anthropic;

  constructor(readonly model: string = 'claude-opus-5-5', client?: Anthropic) {
    // Retries and timeouts are owned by ResilientProvider so they are uniform across vendors and logged.
    this.client = client ?? new Anthropic({ maxRetries: 0 });
  }

  async generateStructured<T>(req: StructuredRequest<T>): Promise<ProviderResult<T>> {
    try {
      const response = await this.client.beta.messages.parse(
        {
          model: this.model,
          max_tokens: 16000,
          betas: [FALLBACK_BETA],
          fallbacks: 'default',
          output_config: { effort: EFFORT_BY_TASK[req.task], format: betaZodOutputFormat(req.schema) },
          system: req.system,
          messages: [{ role: 'user', content: toBlocks(req.content) }],
        },
        { signal: req.signal }
      );

      if (response.stop_reason === 'refusal') {
        throw new ProviderError('Model declined the request', false);
      }
      if (response.stop_reason === 'max_tokens') {
        throw new ProviderError('Model output was truncated (max_tokens)', false);
      }
      if (response.parsed_output == null) {
        throw new ProviderError('Model output did not match the schema', true);
      }

      return {
        data: response.parsed_output as T,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        model: response.model,
      };
    } catch (err) {
      throw mapError(err);
    }
  }

  async chooseTool(req: ToolChoiceRequest): Promise<ProviderResult<ToolCall | null>> {
    try {
      const response = await this.client.beta.messages.create(
        {
          model: this.model,
          max_tokens: 4096,
          betas: [FALLBACK_BETA],
          fallbacks: 'default',
          output_config: { effort: EFFORT_BY_TASK[req.task] },
          system: req.system,
          // Forced tool_choice is rejected on this model; steer from the prompt and keep schemas strict.
          tool_choice: { type: 'auto', disable_parallel_tool_use: true },
          tools: req.tools.map(t => ({
            name: t.name,
            description: t.description,
            strict: true,
            input_schema: t.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
          })),
          messages: [{ role: 'user', content: req.question }],
        },
        { signal: req.signal }
      );

      if (response.stop_reason === 'refusal') {
        throw new ProviderError('Model declined the request', false);
      }

      const toolUse = response.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use'
      );
      return {
        data: toolUse ? { name: toolUse.name, input: toolUse.input } : null,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        model: response.model,
      };
    } catch (err) {
      throw mapError(err);
    }
  }
}
