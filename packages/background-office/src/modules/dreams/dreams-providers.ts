/**
 * Proxy-aware HTTP for dream providers (NB2).
 * Returns classifyOutcome-friendly shapes for dreams-tick failover.
 */
import { fetch as undiciFetch, ProxyAgent } from 'undici';

export type DreamSynthOk = { ok: true; text: string; score?: number };
export type DreamSynthFail = {
  ok: false;
  status?: number;
  bodyText?: string;
  error?: string;
};
export type DreamSynthResult = DreamSynthOk | DreamSynthFail;

export type DreamProviderId = 'perplexity' | 'deepseek' | 'grok' | 'gemini';

export type DreamProviderKeys = {
  PERPLEXITY_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  DREAMS_GROK_MODEL?: string;
  DREAMS_GEMINI_MODEL?: string;
  HTTPS_PROXY?: string;
  HTTP_PROXY?: string;
};

type ProviderSpec = {
  id: DreamProviderId;
  url: string;
  model: string;
  key: string | undefined;
  headers: Record<string, string>;
};

export function resolveProxyUrl(keys: DreamProviderKeys): string {
  return keys.HTTPS_PROXY?.trim() || keys.HTTP_PROXY?.trim() || '';
}

export function providerSpec(id: string, keys: DreamProviderKeys): ProviderSpec | null {
  if (id === 'perplexity') {
    return {
      id: 'perplexity',
      url: 'https://api.perplexity.ai/chat/completions',
      model: 'sonar',
      key: keys.PERPLEXITY_API_KEY?.trim(),
      headers: {},
    };
  }
  if (id === 'deepseek') {
    return {
      id: 'deepseek',
      url: 'https://api.deepseek.com/chat/completions',
      model: keys.DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
      key: keys.DEEPSEEK_API_KEY?.trim(),
      headers: {},
    };
  }
  if (id === 'grok') {
    return {
      id: 'grok',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: keys.DREAMS_GROK_MODEL?.trim() || 'x-ai/grok-2-1212',
      key: keys.OPENROUTER_API_KEY?.trim(),
      headers: {
        'http-referer': 'https://membrana.space',
        'x-title': 'Membrana Dreams',
      },
    };
  }
  if (id === 'gemini') {
    return {
      id: 'gemini',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: keys.DREAMS_GEMINI_MODEL?.trim() || 'google/gemini-2.0-flash-001',
      key: keys.OPENROUTER_API_KEY?.trim(),
      headers: {
        'http-referer': 'https://membrana.space',
        'x-title': 'Membrana Dreams',
      },
    };
  }
  return null;
}

export type FetchLike = (
  url: string,
  init: Record<string, unknown>,
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

/**
 * Low-level chat completions POST (proxy via undici when HTTPS_PROXY set).
 */
export async function postChatCompletion(input: {
  url: string;
  apiKey: string;
  model: string;
  prompt: string;
  extraHeaders?: Record<string, string>;
  proxyUrl?: string;
  fetchFn?: FetchLike;
  timeoutMs?: number;
}): Promise<DreamSynthResult> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${input.apiKey}`,
    ...(input.extraHeaders ?? {}),
  };
  const body = JSON.stringify({
    model: input.model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: input.prompt }],
  });
  const signal = AbortSignal.timeout(input.timeoutMs ?? 90_000);
  const proxy = input.proxyUrl?.trim() || '';

  try {
    let status = 0;
    let text = '';
    if (input.fetchFn) {
      const res = await input.fetchFn(input.url, { method: 'POST', headers, body, signal });
      status = res.status;
      text = await res.text();
      if (!res.ok) {
        return { ok: false, status, bodyText: text.slice(0, 400), error: `HTTP ${status}` };
      }
    } else if (proxy) {
      const dispatcher = new ProxyAgent(proxy);
      try {
        const res = await undiciFetch(input.url, {
          method: 'POST',
          headers,
          body,
          dispatcher,
          signal,
        });
        status = res.status;
        text = await res.text();
        if (!res.ok) {
          return { ok: false, status, bodyText: text.slice(0, 400), error: `HTTP ${status}` };
        }
      } finally {
        try {
          await dispatcher.close();
        } catch {
          /* ignore */
        }
      }
    } else {
      const res = await fetch(input.url, { method: 'POST', headers, body, signal });
      status = res.status;
      text = await res.text();
      if (!res.ok) {
        return { ok: false, status, bodyText: text.slice(0, 400), error: `HTTP ${status}` };
      }
    }

    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, status: 502, bodyText: text.slice(0, 200), error: 'empty-content' };
    }
    return { ok: true, text: content, score: 0.55 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, bodyText: msg };
  }
}

/** Wire one dream provider; missing key → failover-friendly fail (not silent stub). */
export async function synthesizeDreamProvider(
  provider: string,
  prompt: string,
  keys: DreamProviderKeys,
  opts?: { fetchFn?: FetchLike },
): Promise<DreamSynthResult> {
  const spec = providerSpec(provider, keys);
  if (!spec) {
    return {
      ok: false,
      status: 503,
      bodyText: `unknown provider ${provider}`,
      error: 'provider-unknown',
    };
  }
  if (!spec.key) {
    return {
      ok: false,
      status: 401,
      bodyText: `missing api key for ${spec.id}`,
      error: 'provider-not-configured',
    };
  }
  return postChatCompletion({
    url: spec.url,
    apiKey: spec.key,
    model: spec.model,
    prompt,
    extraHeaders: spec.headers,
    proxyUrl: resolveProxyUrl(keys),
    fetchFn: opts?.fetchFn,
  });
}
