export interface Embedder {
  embedTexts(texts: readonly string[]): Promise<number[][]>;
  readonly dimensions: number;
}

export const OPENAI_EMBEDDING_BATCH_SIZE = 32;
