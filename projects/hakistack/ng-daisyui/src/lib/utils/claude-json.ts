import type Anthropic from '@anthropic-ai/sdk';

/** Model used when a component's AI config does not name one. */
export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';

export interface ClaudeJsonOptions {
  /** Anthropic API key supplied by the consumer (usually from the app environment). */
  apiKey: string;
  /** Default: `DEFAULT_CLAUDE_MODEL`. */
  model?: string;
}

export interface ClaudeJsonRequest {
  system: string;
  prompt: string;
  /** JSON Schema for structured outputs. */
  schema: Record<string, unknown>;
}

// One client per key: the SDK keeps connection and retry state.
const clients = new Map<string, Promise<Anthropic>>();

function getClient(apiKey: string): Promise<Anthropic> {
  let client = clients.get(apiKey);
  if (!client) {
    client = loadSdk().then((sdk) => new sdk.default({ apiKey, dangerouslyAllowBrowser: true }));
    // A failed load must not be cached forever.
    client.catch(() => clients.delete(apiKey));
    clients.set(apiKey, client);
  }
  return client;
}

async function loadSdk(): Promise<typeof import('@anthropic-ai/sdk')> {
  try {
    return await import('@anthropic-ai/sdk');
  } catch (e) {
    throw new Error(
      'AI features require the optional peer dependency `@anthropic-ai/sdk`.\n' +
        'Install it:  npm install @anthropic-ai/sdk\n\n' +
        `Underlying error: ${(e as Error).message ?? e}`,
    );
  }
}

/**
 * One Claude call with structured outputs, straight from the browser with the
 * consumer's API key. The SDK is loaded on first use, so apps that never
 * enable AI do not ship it. Resolves with the parsed JSON reply.
 */
export async function requestClaudeJson(options: ClaudeJsonOptions, request: ClaudeJsonRequest, signal?: AbortSignal): Promise<unknown> {
  const client = await getClient(options.apiKey);
  let message: Anthropic.Message;
  try {
    message = await client.messages.create(
      {
        model: options.model ?? DEFAULT_CLAUDE_MODEL,
        max_tokens: 8000,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema: request.schema } },
      },
      { signal },
    );
  } catch (e) {
    throw readableApiError(e);
  }

  if (message.stop_reason === 'refusal') throw new Error('Claude declined this request.');
  if (message.stop_reason === 'max_tokens') throw new Error('The reply was cut off (max_tokens).');
  const text = message.content.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('Claude returned no text.');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Claude did not return valid JSON.');
  }
}

/** "401 {\"type\":\"error\",…}" → "Claude API 401: invalid x-api-key". @internal */
export function readableApiError(e: unknown): unknown {
  const status = (e as { status?: unknown } | null)?.status;
  if (typeof status !== 'number') return e;
  const body = (e as { error?: { error?: { message?: unknown } } }).error;
  const detail = typeof body?.error?.message === 'string' ? body.error.message : (e as Error).message;
  return new Error(`Claude API ${status}: ${detail}`, { cause: e });
}
