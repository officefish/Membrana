export type EmbeddingInputType = 'document' | 'query';

export interface Embedder {
  embedTexts(texts: readonly string[], inputType?: EmbeddingInputType): Promise<number[][]>;
  readonly dimensions: number;
}

export const EMBEDDING_BATCH_SIZE = 32;
