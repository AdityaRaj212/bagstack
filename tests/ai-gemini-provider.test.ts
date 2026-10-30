import { describe, it, expect } from 'vitest';
import { ApiError } from '@google/genai';
import { GeminiProvider, toGeminiSchema, type GeminiClient } from '../src/lib/ai/gemini-provider';
import { ProviderError } from '../src/lib/ai/provider';
import { ResilientProvider, type UsageLogEntry } from '../src/lib/ai/resilient-provider';
import { ExtractionSchema } from '../src/lib/ai/schemas';

/** Stand-in for the SDK client: returns queued responses and records requests. */
function fakeClient(responses: Array<unknown | Error>) {
  const requests: any[] = [];
  const client = {
    models: {
      generateContent: async (req: unknown) => {
        requests.push(req);
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    },
  } as unknown as GeminiClient;
  return { client, requests };
}

const usage = { promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 500 };
const extraction = {
  document_type: 'receipt',
  currency: 'INR',
  period_start: null,
  period_end: null,
  opening_balance: null,
  closing_balance: null,
  stated_total: '651.00',
  rows: [{ date: '2026-06-02', amount: '651.00', merchant: 'CAFE MOCHA', direction: 'debit', balance_after: null }],
};
const extractReq = {
  task: 'extract' as const,
  system: 'sys',
  content: [{ type: 'text' as const, text: 'receipt' }, { type: 'pdf' as const, base64: 'JVBERi0=' }],
  schema: ExtractionSchema,
};

describe('GeminiProvider', () => {
  it('requests schema-constrained JSON and re-parses it with zod', async () => {
    const { client, requests } = fakeClient([{ text: JSON.stringify(extraction), candidates: [{ finishReason: 'STOP' }], usageMetadata: usage }]);
    const res = await new GeminiProvider('gemini-3.8-flash', client).generateStructured(extractReq);
    expect(res.data.rows[0].amount).toBe('651.00');
    // Thinking tokens are billed as output
    expect(res.usage).toEqual({ inputTokens: 1200, outputTokens: 800 });
    const cfg = requests[0].config;
    expect(cfg.responseMimeType).toBe('application/json');
    expect(cfg.responseJsonSchema.additionalProperties).toBe(false);
    expect(cfg.responseJsonSchema.$schema).toBeUndefined();
    expect(cfg.systemInstruction).toBe('sys');
    expect(requests[0].contents[0].parts[1]).toEqual({ inlineData: { mimeType: 'application/pdf', data: 'JVBERi0=' } });
  });

  it('treats schema violations as retryable and content blocks as final', async () => {
    const bad = fakeClient([{ text: JSON.stringify({ rows: 'nope' }), candidates: [{ finishReason: 'STOP' }] }]);
    await expect(new GeminiProvider('m', bad.client).generateStructured(extractReq)).rejects.toMatchObject({ retryable: true });

    // Gemini can withhold output it classifies as sensitive personal information
    const spii = fakeClient([{ text: '', candidates: [{ finishReason: 'SPII' }] }]);
    await expect(new GeminiProvider('m', spii.client).generateStructured(extractReq)).rejects.toMatchObject({ retryable: false, message: expect.stringContaining('SPII') });
  });

  it('maps free-tier 429s to retryable errors with the server-suggested delay', async () => {
    const quota = new ApiError({ message: '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"17s"}]}}', status: 429 });
    const { client } = fakeClient([quota]);
    const err = await new GeminiProvider('m', client).generateStructured(extractReq).catch(e => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toMatchObject({ retryable: true, status: 429, retryAfterMs: 17_000 });

    const { client: c400 } = fakeClient([new ApiError({ message: 'bad schema', status: 400 })]);
    await expect(new GeminiProvider('m', c400).generateStructured(extractReq)).rejects.toMatchObject({ retryable: false, status: 400 });
  });

  it('returns the chosen function call, or null when the model declines', async () => {
    const tools = [{ name: 'account_balances', description: 'd', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }];
    const call = fakeClient([{ functionCalls: [{ name: 'account_balances', args: {} }], candidates: [{ finishReason: 'STOP' }], usageMetadata: usage }]);
    const p = new GeminiProvider('m', call.client);
    const res = await p.chooseTool({ task: 'query', system: 's', question: 'balance?', tools });
    expect(res.data).toEqual({ name: 'account_balances', input: {} });
    expect(call.requests[0].config.tools[0].functionDeclarations[0].parametersJsonSchema).toEqual(tools[0].inputSchema);
    expect(call.requests[0].config.toolConfig.functionCallingConfig.mode).toBe('AUTO');

    const none = fakeClient([{ text: 'I can only read data.', candidates: [{ finishReason: 'STOP' }] }]);
    expect((await new GeminiProvider('m', none.client).chooseTool({ task: 'query', system: 's', question: 'delete all', tools })).data).toBeNull();
  });

  it('waits at least the suggested delay before retrying and logs free-tier usage at $0', async () => {
    const quota = new ApiError({ message: 'Please retry in 12.5s.', status: 429 });
    const { client } = fakeClient([quota, { text: JSON.stringify(extraction), candidates: [{ finishReason: 'STOP' }], usageMetadata: usage }]);
    const waits: number[] = [];
    const logs: UsageLogEntry[] = [];
    const p = new ResilientProvider(new GeminiProvider('gemini-3.8-flash', client), {
      sleep: async ms => { waits.push(ms); },
      logger: e => logs.push(e),
      freeTier: true,
    });
    await p.generateStructured(extractReq);
    expect(waits[0]).toBeGreaterThanOrEqual(12_500);
    expect(logs[0]).toMatchObject({ status: 'ok', attempts: 2, costMicroUsd: 0, usage: { inputTokens: 1200, outputTokens: 800 } });
  });

  it('rewrites nullable anyOf into type arrays and drops numeric bounds', () => {
    const schema = {
      type: 'object',
      properties: {
        category: { anyOf: [{ type: 'string', enum: ['Food', 'Rent'] }, { type: 'null' }], description: 'cat' },
        limit: { anyOf: [{ type: 'integer', minimum: -9007199254740991, maximum: 9007199254740991 }, { type: 'null' }] },
        index: { type: 'integer', minimum: 0, maximum: 10 },
      },
      required: ['category', 'limit', 'index'],
      additionalProperties: false,
    };
    expect(toGeminiSchema(schema)).toEqual({
      type: 'object',
      properties: {
        category: { type: ['string', 'null'], enum: ['Food', 'Rent', null], description: 'cat' },
        limit: { type: ['integer', 'null'] },
        index: { type: 'integer' },
      },
      required: ['category', 'limit', 'index'],
      additionalProperties: false,
    });
  });

  it('produces anyOf-free schemas for every real request schema', async () => {
    const { client, requests } = fakeClient([{ text: JSON.stringify(extraction), candidates: [{ finishReason: 'STOP' }] }]);
    await new GeminiProvider('m', client).generateStructured(extractReq);
    const text = JSON.stringify(requests[0].config.responseJsonSchema);
    expect(text).not.toMatch(/anyOf|minimum|maximum|\$schema/);
  });
});
