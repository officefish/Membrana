import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRagConfig } from '../config.js';
import { createEmbedder, embeddingFingerprint } from './embedder-factory.js';

describe('Voyage embedder', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Voyage endpoint and retrieval input type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.9] }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const config = loadRagConfig({ RAG_EMBEDDING_PROVIDER: 'voyage' });
    const embedder = createEmbedder(config, { VOYAGE_API_KEY: 'test-key' });

    await expect(embedder.embedTexts(['query text'], 'query')).resolves.toEqual([[0.1, 0.9]]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.voyageai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          input: ['query text'],
          model: 'voyage-4-lite',
          input_type: 'query',
          output_dimension: 1024,
        }),
      }),
    );
    expect(embeddingFingerprint(config, embedder)).toBe('voyage:voyage-4-lite:1024');
  });

  it('requires a Voyage key', () => {
    const config = loadRagConfig({ RAG_EMBEDDING_PROVIDER: 'voyage' });
    expect(() => createEmbedder(config, {})).toThrow(/VOYAGE_API_KEY/u);
  });

  it('uses distinct fingerprints for incompatible providers', () => {
    const openAiConfig = loadRagConfig({});
    const voyageConfig = loadRagConfig({ RAG_EMBEDDING_PROVIDER: 'voyage' });
    const openAi = createEmbedder(openAiConfig, { OPENAI_API_KEY: 'test-key' });
    const voyage = createEmbedder(voyageConfig, { VOYAGE_API_KEY: 'test-key' });

    expect(embeddingFingerprint(openAiConfig, openAi)).not.toBe(
      embeddingFingerprint(voyageConfig, voyage),
    );
  });
});
