import type { RagConfig } from '../config.js';
import type { Embedder } from './types.js';

const DEFAULT_DIMENSIONS = 1536;

interface OpenAiEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
}

export function createOpenAiEmbedder(
  config: RagConfig,
  env: NodeJS.ProcessEnv = process.env,
): Embedder {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embedding (set in .env)');
  }

  const embeddingUrl = `${config.openaiBaseUrl}/embeddings`;

  return {
    dimensions: DEFAULT_DIMENSIONS,
    async embedTexts(texts: readonly string[]): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }

      const response = await fetch(embeddingUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.embeddingModel,
          input: [...texts],
        }),
      });

      const payload = (await response.json()) as OpenAiEmbeddingResponse;
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
