import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRagConfig } from '../config.js';
import { createOpenAiEmbedder } from './openai-embedder.js';

describe('createOpenAiEmbedder OPENAI_BASE_URL', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts embeddings to the configured proxy endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [0.25, 0.75] }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const config = loadRagConfig({
      OPENAI_BASE_URL: 'http://127.0.0.1:8080/openai/v1/',
    });
    const embedder = createOpenAiEmbedder(config, { OPENAI_API_KEY: 'test-key' });

    await expect(embedder.embedTexts(['proxy smoke'])).resolves.toEqual([[0.25, 0.75]]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8080/openai/v1/embeddings',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
