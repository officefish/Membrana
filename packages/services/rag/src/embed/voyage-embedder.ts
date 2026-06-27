import type { RagConfig } from '../config.js';
import type { Embedder, EmbeddingInputType } from './types.js';

const DEFAULT_DIMENSIONS = 1024;

interface VoyageEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  detail?: string;
}

export function createVoyageEmbedder(
  config: RagConfig,
  env: NodeJS.ProcessEnv = process.env,
): Embedder {
  const apiKey = env.VOYAGE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is required when RAG_EMBEDDING_PROVIDER=voyage');
  }

  return {
    dimensions: DEFAULT_DIMENSIONS,
    async embedTexts(
      texts: readonly string[],
      inputType?: EmbeddingInputType,
    ): Promise<number[][]> {
      if (texts.length === 0) return [];

      const response = await fetch(`${config.voyageBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: [...texts],
          model: config.embeddingModel,
          ...(inputType ? { input_type: inputType } : {}),
          output_dimension: DEFAULT_DIMENSIONS,
        }),
      });

      const payload = (await response.json()) as VoyageEmbeddingResponse;
      if (!response.ok) {
        throw new Error(payload.detail ?? `Voyage embeddings HTTP ${response.status}`);
      }

      return (payload.data ?? []).map((row, index) => {
        const embedding = row.embedding;
        if (!embedding || embedding.length === 0) {
          throw new Error(`Voyage embeddings: missing vector at index ${index}`);
        }
        return embedding;
      });
    },
  };
}
