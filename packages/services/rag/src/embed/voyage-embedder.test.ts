import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRagConfig } from '../config.js';
import { createEmbedder } from './factory.js';
import { createVoyageEmbedder, resolveProxyUrl, resolveVoyageApiKey, retryDelayMs } from './voyage-embedder.js';

function voyageConfig(env: NodeJS.ProcessEnv = {}) {
  return loadRagConfig({ RAG_EMBEDDING_PROVIDER: 'voyage', ...env });
}

function mockFetchOnce(status: number, body: unknown) {
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
});

describe('config: провайдер voyage', () => {
  it('RAG_EMBEDDING_PROVIDER=voyage → провайдер voyage с дефолтной моделью voyage-3.5-lite', () => {
    const cfg = voyageConfig();
    expect(cfg.embeddingProvider).toBe('voyage');
    expect(cfg.embeddingModel).toBe('voyage-3.5-lite');
  });

  it('явный RAG_EMBEDDING_MODEL побеждает дефолт', () => {
    expect(voyageConfig({ RAG_EMBEDDING_MODEL: 'voyage-code-3' }).embeddingModel).toBe('voyage-code-3');
  });

  it('дефолтный провайдер остаётся openai с text-embedding-3-small (регресс)', () => {
    const cfg = loadRagConfig({});
    expect(cfg.embeddingProvider).toBe('openai');
    expect(cfg.embeddingModel).toBe('text-embedding-3-small');
  });
});

describe('resolveVoyageApiKey', () => {
  it('VOYAGE_API_KEY канонический; VOYAGEAI_API_KEY — принятый алиас; иначе null', () => {
    expect(resolveVoyageApiKey({ VOYAGE_API_KEY: 'k1', VOYAGEAI_API_KEY: 'k2' })).toBe('k1');
    expect(resolveVoyageApiKey({ VOYAGEAI_API_KEY: 'k2' })).toBe('k2');
    expect(resolveVoyageApiKey({})).toBe(null);
  });
});

describe('resolveProxyUrl', () => {
  it('HTTPS_PROXY приоритетнее HTTP_PROXY; пусто → null (прямой fetch)', () => {
    expect(resolveProxyUrl({ HTTPS_PROXY: 'http://p:1', HTTP_PROXY: 'http://p:2' })).toBe('http://p:1');
    expect(resolveProxyUrl({ HTTP_PROXY: 'http://p:2' })).toBe('http://p:2');
    expect(resolveProxyUrl({ HTTPS_PROXY: '  ' })).toBe(null);
    expect(resolveProxyUrl({})).toBe(null);
  });
});

describe('createVoyageEmbedder', () => {
  it('без ключа → понятная ошибка', () => {
    expect(() => createVoyageEmbedder(voyageConfig(), {})).toThrow('VOYAGE_API_KEY');
  });

  it('embedTexts: корректный запрос и парсинг data[].embedding', async () => {
    const fetchFn = mockFetchOnce(200, { data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }] });
    const embedder = createVoyageEmbedder(voyageConfig(), { VOYAGEAI_API_KEY: 'vk' });
    const vectors = await embedder.embedTexts(['a', 'b']);
    expect(vectors).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.voyageai.com/v1/embeddings');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer vk');
    expect(JSON.parse(init.body as string)).toEqual({ model: 'voyage-3.5-lite', input: ['a', 'b'] });
  });

  it('пустой вход → [] без fetch', async () => {
    const fetchFn = mockFetchOnce(200, {});
    const embedder = createVoyageEmbedder(voyageConfig(), { VOYAGE_API_KEY: 'vk' });
    expect(await embedder.embedTexts([])).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('HTTP-ошибка → throw с detail', async () => {
    mockFetchOnce(401, { detail: 'Provided API key is invalid.' });
    const embedder = createVoyageEmbedder(voyageConfig(), { VOYAGE_API_KEY: 'bad' });
    await expect(embedder.embedTexts(['x'])).rejects.toThrow('Provided API key is invalid.');
  });

  it('дырка в data → throw с индексом', async () => {
    mockFetchOnce(200, { data: [{ embedding: [] }] });
    const embedder = createVoyageEmbedder(voyageConfig(), { VOYAGE_API_KEY: 'vk' });
    await expect(embedder.embedTexts(['x'])).rejects.toThrow('missing vector at index 0');
  });

  it('dimensions: known-модель 1024', () => {
    expect(createVoyageEmbedder(voyageConfig(), { VOYAGE_API_KEY: 'vk' }).dimensions).toBe(1024);
  });
});

describe('retry на 429', () => {
  it('retryDelayMs: Retry-After сервера побеждает; иначе экспонента 2/4/8/16с', () => {
    expect(retryDelayMs(0, '7')).toBe(7000);
    expect(retryDelayMs(0, null)).toBe(2000);
    expect(retryDelayMs(1, null)).toBe(4000);
    expect(retryDelayMs(3, 'not-a-number')).toBe(16000);
  });

  it('429 → повтор → успех (после паузы)', async () => {
    vi.useFakeTimers();
    try {
      const responses = [
        { ok: false, status: 429, headers: { get: () => '0.001' }, text: async () => '{"detail":"rate limit"}' },
        { ok: true, status: 200, headers: { get: () => null }, text: async () => '{"data":[{"embedding":[1]}]}' },
      ];
      const fn = vi.fn(async () => responses.shift());
      vi.stubGlobal('fetch', fn);
      const embedder = createVoyageEmbedder(voyageConfig(), { VOYAGE_API_KEY: 'vk' });
      const promise = embedder.embedTexts(['x']);
      await vi.runAllTimersAsync();
      expect(await promise).toEqual([[1]]);
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('createEmbedder (фабрика)', () => {
  it('voyage → voyage-эмбеддер; openai → openai-эмбеддер (по требуемому ключу)', () => {
    expect(() => createEmbedder(voyageConfig(), {})).toThrow('VOYAGE_API_KEY');
    expect(() => createEmbedder(loadRagConfig({}), {})).toThrow('OPENAI_API_KEY');
    const ok = createEmbedder(voyageConfig(), { VOYAGEAI_API_KEY: 'vk' });
    expect(ok.dimensions).toBe(1024);
  });
});
