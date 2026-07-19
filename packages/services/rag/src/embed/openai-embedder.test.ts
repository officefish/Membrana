import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRagConfig } from '../config.js';
import { createOpenAiEmbedder } from './openai-embedder.js';
import { resolveProxyUrl } from './proxy.js';

const undiciState = vi.hoisted(() => ({
  fetch: vi.fn(),
  ProxyAgent: class MockProxyAgent {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  },
}));

vi.mock('undici', () => ({
  fetch: undiciState.fetch,
  ProxyAgent: undiciState.ProxyAgent,
}));

function openaiConfig(env: NodeJS.ProcessEnv = {}) {
  return loadRagConfig({ RAG_EMBEDDING_PROVIDER: 'openai', ...env });
}

function mockGlobalFetchOnce(status: number, body: unknown) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => raw,
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  undiciState.fetch.mockReset();
});

describe('resolveProxyUrl (shared)', () => {
  it('HTTPS_PROXY приоритетнее HTTP_PROXY; пусто → null', () => {
    expect(resolveProxyUrl({ HTTPS_PROXY: 'http://p:1', HTTP_PROXY: 'http://p:2' })).toBe('http://p:1');
    expect(resolveProxyUrl({ HTTP_PROXY: 'http://p:2' })).toBe('http://p:2');
    expect(resolveProxyUrl({})).toBe(null);
  });
});

describe('createOpenAiEmbedder (#593 proxy)', () => {
  it('без ключа → понятная ошибка', () => {
    expect(() => createOpenAiEmbedder(openaiConfig(), {})).toThrow('OPENAI_API_KEY');
  });

  it('без прокси → global fetch, парсинг data[].embedding', async () => {
    const fetchFn = mockGlobalFetchOnce(200, {
      data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
    });
    const embedder = createOpenAiEmbedder(openaiConfig(), { OPENAI_API_KEY: 'sk' });
    const vectors = await embedder.embedTexts(['a', 'b']);
    expect(vectors).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(undiciState.fetch).not.toHaveBeenCalled();
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/embeddings');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk');
  });

  it('с HTTPS_PROXY → undici fetch + dispatcher (#593)', async () => {
    undiciState.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [{ embedding: [1, 2] }] }),
    });
    const globalFetch = mockGlobalFetchOnce(200, { data: [{ embedding: [9] }] });
    const embedder = createOpenAiEmbedder(openaiConfig(), {
      OPENAI_API_KEY: 'sk',
      HTTPS_PROXY: 'http://127.0.0.1:12334',
    });
    expect(await embedder.embedTexts(['x'])).toEqual([[1, 2]]);
    expect(undiciState.fetch).toHaveBeenCalledTimes(1);
    expect(globalFetch).not.toHaveBeenCalled();
    const [, init] = undiciState.fetch.mock.calls[0] as unknown as [
      string,
      { dispatcher?: { url: string } },
    ];
    expect(init.dispatcher?.url).toBe('http://127.0.0.1:12334');
  });

  it('пустой вход → [] без fetch', async () => {
    const fetchFn = mockGlobalFetchOnce(200, {});
    const embedder = createOpenAiEmbedder(openaiConfig(), { OPENAI_API_KEY: 'sk' });
    expect(await embedder.embedTexts([])).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('гео-403 HTML → throw со статусом, не SyntaxError', async () => {
    mockGlobalFetchOnce(403, '<html>Country, region, or territory not supported</html>');
    const embedder = createOpenAiEmbedder(openaiConfig(), { OPENAI_API_KEY: 'sk' });
    await expect(embedder.embedTexts(['x'])).rejects.toThrow(/HTTP 403.*non-JSON/);
  });
});
