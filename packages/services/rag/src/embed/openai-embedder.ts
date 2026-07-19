import { fetch as undiciFetch, ProxyAgent } from 'undici';

import type { RagConfig } from '../config.js';
import { resolveProxyUrl } from './proxy.js';
import type { Embedder } from './types.js';

const DEFAULT_DIMENSIONS = 1536;

interface OpenAiEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
}

/**
 * OpenAI embeddings. При HTTPS_PROXY/HTTP_PROXY — undici+ProxyAgent (#593),
 * иначе global fetch (как до фикса; чистые сети / office).
 */
export function createOpenAiEmbedder(
  config: RagConfig,
  env: NodeJS.ProcessEnv = process.env,
): Embedder {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embedding (set in .env)');
  }

  const embeddingUrl = `${config.openaiBaseUrl}/embeddings`;
  const proxyUrl = resolveProxyUrl(env);
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  return {
    dimensions: DEFAULT_DIMENSIONS,
    async embedTexts(texts: readonly string[]): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }

      const init = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.embeddingModel,
          input: [...texts],
        }),
      };

      const response = dispatcher
        ? await undiciFetch(embeddingUrl, { ...init, dispatcher })
        : await fetch(embeddingUrl, init);

      const raw = await response.text();
      let payload: OpenAiEmbeddingResponse;
      try {
        payload = JSON.parse(raw) as OpenAiEmbeddingResponse;
      } catch {
        throw new Error(
          `OpenAI embeddings HTTP ${response.status}: non-JSON response: ${raw.slice(0, 200)}`,
        );
      }
      if (!response.ok) {
        throw new Error(payload.error?.message ?? `OpenAI embeddings HTTP ${response.status}`);
      }

      const rows = payload.data ?? [];
      return rows.map((row, index) => {
        const embedding = row.embedding;
        if (!embedding || embedding.length === 0) {
          throw new Error(`OpenAI embeddings: missing vector at index ${index}`);
        }
        return embedding;
      });
    },
  };
}

export async function embedInBatches(
  embedder: Embedder,
  texts: readonly string[],
  batchSize: number,
): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchVectors = await embedder.embedTexts(batch);
    vectors.push(...batchVectors);
  }
  return vectors;
}
