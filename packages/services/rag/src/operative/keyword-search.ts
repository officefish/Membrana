import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { glob } from 'glob';

import { splitMarkdown } from '../chunk/markdown-splitter.js';
import type { RagConfig } from '../config.js';
import type { ChunkMetadata, RAGFragment, RAGOptions } from '../types.js';
import { pathPriorityBoost } from './path-filters.js';
import { getRecentDocs, type DocRef } from './recent-docs.js';
import {
  applyFreshnessDecay,
  daysAgo,
  operativeBaseScore,
  scoreFragment,
  uniqueQueryTerms,
} from './scoring.js';

export interface OperativeSearchOptions {
  days?: number;
  topK?: number;
  relevanceThreshold?: number;
}

interface RankedOperativeHit {
  text: string;
  score: number;
  metadata: ChunkMetadata;
}

function excerptPlainText(content: string, maxChars = 1200): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

function buildMetadata(
  doc: DocRef,
  chunkIndex: number,
  headingPath?: string,
): ChunkMetadata {
  return {
    source: doc.relativePath,
    type: 'operative',
    timestamp: doc.modifiedAt.toISOString(),
    tags: [],
    priority: pathPriorityBoost(doc.priority),
    chunkIndex,
    isHistorical: doc.relativePath.includes('/archive/'),
    status: 'active',
    headingPath: headingPath || undefined,
  };
}

async function rankDocument(
  doc: DocRef,
  queryTerms: readonly string[],
  windowDays: number,
  now: Date,
): Promise<RankedOperativeHit[]> {
  const content = await readFile(doc.absolutePath, 'utf8');
  const freshness = applyFreshnessDecay(daysAgo(doc.modifiedAt, now), windowDays);
  const pathBoost = pathPriorityBoost(doc.priority);
  const hits: RankedOperativeHit[] = [];

  if (doc.relativePath.endsWith('.md')) {
    const chunks = splitMarkdown(content);
    for (const chunk of chunks) {
      const base = operativeBaseScore(queryTerms, chunk.text);
      if (base <= 0) {
        continue;
      }
      hits.push({
        text: chunk.text,
        score: scoreFragment(base, freshness, pathBoost),
        metadata: buildMetadata(doc, chunk.chunkIndex, chunk.headingPath),
      });
    }
  }

  if (hits.length === 0) {
    const base = operativeBaseScore(queryTerms, content);
    if (base > 0) {
      hits.push({
        text: excerptPlainText(content),
        score: scoreFragment(base, freshness, pathBoost),
        metadata: buildMetadata(doc, 0),
      });
    }
  }

  return hits;
}

function toFragments(hits: RankedOperativeHit[]): RAGFragment[] {
  return hits.map((hit) => ({
    text: hit.text,
    score: hit.score,
    circuit: 'operative' as const,
    metadata: hit.metadata,
  }));
}

/**
 * Keyword/BM25-lite search over recent operative docs (no vector store).
 */
export async function keywordSearch(
  repoRoot: string,
  query: string,
  options: OperativeSearchOptions = {},
): Promise<RAGFragment[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const days = options.days ?? 7;
  const topK = options.topK ?? 5;
  const threshold = options.relevanceThreshold ?? 0;
  const queryTerms = uniqueQueryTerms(trimmed);
  if (queryTerms.length === 0) {
    return [];
  }

  const docs = await getRecentDocs(repoRoot, days);
  const now = new Date();
  const allHits: RankedOperativeHit[] = [];

  for (const doc of docs) {
    const hits = await rankDocument(doc, queryTerms, days, now);
    allHits.push(...hits);
  }

  return toFragments(
    allHits
      .filter((hit) => hit.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK),
  );
}

/**
 * Load fragments from explicit path patterns (operative path boost only).
 */
export async function searchByPathPatterns(
  repoRoot: string,
  patterns: readonly string[],
  queryHint = '',
): Promise<RAGFragment[]> {
  const root = resolve(repoRoot);
  const queryTerms = uniqueQueryTerms(queryHint);
  const hits: RankedOperativeHit[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: root, nodir: true, posix: true });
    for (const match of matches) {
      const relativePath = match.replace(/\\/g, '/');
      const absolutePath = resolve(root, relativePath);
      const content = await readFile(absolutePath, 'utf8');
      const doc: DocRef = {
        relativePath,
        absolutePath,
        mtimeMs: Date.now(),
        priority: 'P3',
        modifiedAt: new Date(),
      };
      const base =
        queryTerms.length > 0 ? operativeBaseScore(queryTerms, content) : 1;
      if (base <= 0) {
        continue;
      }
      hits.push({
        text: excerptPlainText(content),
        score: scoreFragment(base, 1, pathPriorityBoost(doc.priority)),
        metadata: buildMetadata(doc, 0),
      });
    }
  }

  return toFragments(hits.sort((a, b) => b.score - a.score));
}

/** Operative circuit entry point for dual retriever (R2). */
export async function retrieveOperativeContext(
  repoRoot: string,
  query: string,
  config: RagConfig,
  options: RAGOptions = {},
): Promise<{ fragments: RAGFragment[]; usedOperative: boolean }> {
  const fragments = await keywordSearch(repoRoot, query, {
    days: options.operativeDays ?? config.operativeDays,
    topK: options.topK ?? config.topK,
    relevanceThreshold: 0,
  });

  return {
    fragments,
    usedOperative: fragments.length > 0,
  };
}

/** Count operative hits above relevance threshold (used by R3 merge). */
export function countSufficientOperativeHits(
  fragments: readonly RAGFragment[],
  threshold: number,
): number {
  return fragments.filter((fragment) => fragment.score >= threshold).length;
}
