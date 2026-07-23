/**
 * Thin ritual transport (X1) — catalog-driven; no import from experimental/.
 * Phase A: classify + build request bodies; HTTP via injectable postFn.
 */
import { loadProviderCatalog } from './llm-procedure-registry.mjs';

/**
 * @typedef {{
 *   ok: boolean;
 *   status: number;
 *   text: string;
 *   tokensIn?: number | null;
 *   tokensOut?: number | null;
 *   errorClass?: string;
 *   latencyMs: number;
 * }} TransportResult
 */

/**
 * @param {number} status
 * @param {string} [bodyText]
 * @returns {'auth'|'rate_limit'|'timeout'|'protocol'|'unknown'}
 */
export function classifyTransportError(status, bodyText = '') {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 408 || status === 504) return 'timeout';
  const lower = bodyText.toLowerCase();
  if (lower.includes('rate') && lower.includes('limit')) return 'rate_limit';
  if (lower.includes('credit') || lower.includes('usage limit') || lower.includes('quota')) {
    return 'rate_limit';
  }
  if (status >= 400 && status < 500) return 'protocol';
  if (status >= 500) return 'protocol';
  return 'unknown';
}

/**
 * @param {string} providerId
 * @param {{ catalog?: ReturnType<typeof loadProviderCatalog> }} [opts]
 */
export function getProviderEntry(providerId, opts = {}) {
  const catalog = opts.catalog ?? loadProviderCatalog();
  const entry = catalog.providers?.[providerId];
  if (!entry) {
    throw new Error(`getProviderEntry: неизвестный provider «${providerId}»`);
  }
  return entry;
}

/**
 * Normalize chat turns for providers (anthropic blocks ↔ openai strings).
 * @param {Array<{ role: string; content: unknown }> | undefined} messages
 * @param {string} [prompt]
 * @param {'anthropic' | 'openai-compatible'} apiFormat
 */
export function normalizeMessages(messages, prompt, apiFormat) {
  /** @type {Array<{ role: string; content: unknown }>} */
  const turns =
    Array.isArray(messages) && messages.length > 0
      ? messages
      : [
          {
            role: 'user',
            content:
              apiFormat === 'anthropic'
                ? [{ type: 'text', text: prompt ?? '' }]
                : (prompt ?? ''),
          },
        ];

  if (apiFormat === 'anthropic') {
    return turns.map((m) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? [{ type: 'text', text: m.content }]
          : m.content,
    }));
  }

  return turns.map((m) => {
    let content = m.content;
    if (Array.isArray(content)) {
      content = content
        .filter((b) => b && typeof b === 'object' && b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    } else if (typeof content !== 'string') {
      content = String(content ?? '');
    }
    return { role: m.role, content };
  });
}

/**
 * @param {{
 *   provider: string;
 *   model: string;
 *   prompt?: string;
 *   messages?: Array<{ role: string; content: unknown }>;
 *   maxTokens?: number;
 *   apiKey: string;
 *   catalog?: ReturnType<typeof loadProviderCatalog>;
 * }} args
 */
export function buildProviderRequest(args) {
  const entry = getProviderEntry(args.provider, { catalog: args.catalog });
  const maxTokens = args.maxTokens ?? 4096;
  const baseUrl = String(entry.defaultBaseUrl).replace(/\/$/, '');
  const url = `${baseUrl}${entry.path}`;
  const apiFormat = entry.apiFormat;

  if (apiFormat === 'anthropic') {
    return {
      url,
      headers: {
        'content-type': 'application/json',
        'x-api-key': args.apiKey,
        'anthropic-version': '2023-06-01',
      },
      bodyJson: {
        model: args.model,
        max_tokens: maxTokens,
        messages: normalizeMessages(args.messages, args.prompt, 'anthropic'),
      },
      apiFormat: 'anthropic',
      apiKeyEnv: entry.apiKeyEnv,
    };
  }

  if (apiFormat === 'openai-compatible') {
    /** @type {Record<string, string>} */
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${args.apiKey}`,
    };
    if (entry.extraHeaders && typeof entry.extraHeaders === 'object') {
      Object.assign(headers, entry.extraHeaders);
    }
    return {
      url,
      headers,
      bodyJson: {
        model: args.model,
        max_tokens: maxTokens,
        messages: normalizeMessages(args.messages, args.prompt, 'openai-compatible'),
      },
      apiFormat: 'openai-compatible',
      apiKeyEnv: entry.apiKeyEnv,
    };
  }

  throw new Error(`buildProviderRequest: apiFormat «${apiFormat}» не поддержан в v1`);
}

/**
 * Extract assistant text + optional usage from provider response body.
 * @param {string} apiFormat
 * @param {string} text
 * @returns {{ text: string; tokensIn: number | null; tokensOut: number | null }}
 */
export function parseProviderResponse(apiFormat, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { text: '', tokensIn: null, tokensOut: null };
  }

  let outText = '';
  if (apiFormat === 'anthropic') {
    const blocks = Array.isArray(parsed?.content) ? parsed.content : [];
    outText = blocks
      .filter((b) => b?.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('');
  } else if (apiFormat === 'openai-compatible') {
    const choice = parsed?.choices?.[0];
    const content = choice?.message?.content;
    outText = typeof content === 'string' ? content : '';
  }

  const usage = parsed?.usage;
  const tokensIn =
    usage?.input_tokens ?? usage?.prompt_tokens ?? null;
  const tokensOut =
    usage?.output_tokens ?? usage?.completion_tokens ?? null;

  return {
    text: outText,
    tokensIn: typeof tokensIn === 'number' ? tokensIn : null,
    tokensOut: typeof tokensOut === 'number' ? tokensOut : null,
  };
}

/**
 * Stub-friendly call: inject `postFn` for tests; without it returns not-wired.
 *
 * @param {{
 *   provider: string;
 *   model: string;
 *   prompt?: string;
 *   messages?: Array<{ role: string; content: unknown }>;
 *   maxTokens?: number;
 *   apiKey?: string;
 *   env?: NodeJS.ProcessEnv;
 *   catalog?: ReturnType<typeof loadProviderCatalog>;
 *   postFn?: (url: string, opts: { headers: Record<string, string>; bodyJson: Record<string, unknown> }) => Promise<{ ok: boolean; status: number; text: string }>;
 *   now?: () => number;
 * }} args
 * @returns {Promise<TransportResult & { text?: string; apiFormat?: string; reason?: string }>}
 */
export async function callProvider(args) {
  const now = args.now ?? (() => Date.now());
  const t0 = now();
  const catalog = args.catalog ?? loadProviderCatalog();
  const entry = getProviderEntry(args.provider, { catalog });
  const env = args.env ?? process.env;
  const apiKey = (args.apiKey ?? env[entry.apiKeyEnv] ?? '').trim();

  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      text: '',
      tokensIn: null,
      tokensOut: null,
      errorClass: 'auth',
      latencyMs: Math.max(0, now() - t0),
    };
  }

  if (typeof args.postFn !== 'function') {
    return {
      ok: false,
      status: 0,
      text: '',
      tokensIn: null,
      tokensOut: null,
      errorClass: 'unknown',
      latencyMs: Math.max(0, now() - t0),
      // Without postFn this is a unit-test / dry stub (ritual wires createCatalogPostFn).
      reason: 'transport-stub-no-postFn',
    };
  }

  const req = buildProviderRequest({
    provider: args.provider,
    model: args.model,
    prompt: args.prompt,
    messages: args.messages,
    maxTokens: args.maxTokens,
    apiKey,
    catalog,
  });

  try {
    const { ok, status, text } = await args.postFn(req.url, {
      headers: req.headers,
      bodyJson: req.bodyJson,
    });
    const latencyMs = Math.max(0, now() - t0);
    if (!ok) {
      return {
        ok: false,
        status,
        text,
        tokensIn: null,
        tokensOut: null,
        errorClass: classifyTransportError(status, text),
        latencyMs,
        apiFormat: req.apiFormat,
      };
    }
    const parsed = parseProviderResponse(req.apiFormat, text);
    return {
      ok: true,
      status,
      text: parsed.text,
      tokensIn: parsed.tokensIn,
      tokensOut: parsed.tokensOut,
      latencyMs,
      apiFormat: req.apiFormat,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = /timeout|aborted|ETIMEDOUT/i.test(msg);
    return {
      ok: false,
      status: 0,
      text: msg,
      tokensIn: null,
      tokensOut: null,
      errorClass: isTimeout ? 'timeout' : 'unknown',
      latencyMs: Math.max(0, now() - t0),
    };
  }
}
