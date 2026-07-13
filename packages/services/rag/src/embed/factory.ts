import type { RagConfig } from '../config.js';
import { createOpenAiEmbedder } from './openai-embedder.js';
import { createVoyageEmbedder } from './voyage-embedder.js';
import type { Embedder } from './types.js';

/**
 * Единственная точка выбора эмбеддера по `config.embeddingProvider` (Issue #425).
 * Потребители (pipeline, archive-port) не знают о конкретных провайдерах.
 */
export function createEmbedder(config: RagConfig, env: NodeJS.ProcessEnv = process.env): Embedder {
  switch (config.embeddingProvider) {
    case 'voyage':
      return createVoyageEmbedder(config, env);
    case 'openai':
      return createOpenAiEmbedder(config, env);
  }
}
