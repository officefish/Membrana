/** Rough token count (~4 chars per token for English/technical text). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export const MAX_CHUNK_TOKENS = 500;
export const CHUNK_OVERLAP_TOKENS = 50;

export const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * 4;
export const CHUNK_OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * 4;
