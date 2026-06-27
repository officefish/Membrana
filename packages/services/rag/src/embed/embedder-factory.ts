import type { RagConfig } from '../config.js';
import type { Embedder } from './types.js';
import { createOpenAiEmbedder } from './openai-embedder.js';
import { createVoyageEmbedder } from './voyage-embedder.js';

export function createEmbedder(
  config: RagConfig,
  env: NodeJS.ProcessEnv = process.env,
): Embedder {
  return config.embeddingProvider === 'voyage'
    ? createVoyageEmbedder(config, env)
    : createOpenAiEmbedder(config, env);
}

export function embeddingFingerprint(config: RagConfig, embedder: Embedder): string {
  return `${config.embeddingProvider}:${config.embeddingModel}:${embedder.dimensions}`;
}
