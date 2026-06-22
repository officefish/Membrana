import type { RagChunkType } from '../types.js';

export const INDEX_GLOB_PATTERNS = [
  'docs/**/*.md',
  '*.md',
  '.cursorrules',
  'AGENTS.md',
  'packages/core/src/**/*.ts',
  'packages/agenda/src/**/*.ts',
  'packages/services/audio-engine/src/**/*.ts',
  'packages/services/fft-analyzer/src/**/*.ts',
  'docs/prompts/*_PROMPT.md',
  'docs/tasks/archive/**/*.md',
] as const;

const EXCLUDE_SUBSTRINGS = [
  'node_modules',
  '/dist/',
  '\\dist\\',
  '.generated.',
  '.test.',
  '/coverage/',
  '/.turbo/',
] as const;

export function shouldExcludeIndexPath(relativePosix: string): boolean {
  const lower = relativePosix.toLowerCase();
  return EXCLUDE_SUBSTRINGS.some((part) => lower.includes(part));
}

export function classifySourceType(relativePosix: string): RagChunkType {
  if (relativePosix.startsWith('docs/archive/')) {
    return 'archive';
  }
  if (relativePosix.startsWith('docs/tasks/archive/')) {
    return 'task';
  }
  if (relativePosix.startsWith('docs/prompts/') && relativePosix.endsWith('_PROMPT.md')) {
    return 'prompt';
  }
  if (relativePosix.endsWith('.ts')) {
    return 'code';
  }
  return 'doc';
}

export function isHistoricalArchive(relativePosix: string): boolean {
  return relativePosix.startsWith('docs/archive/');
}

export function archivePriority(relativePosix: string): number {
  return isHistoricalArchive(relativePosix) ? 0.5 : 1.0;
}
