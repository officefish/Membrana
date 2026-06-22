import type { RagConfig } from '../config.js';
import { countSufficientOperativeHits } from '../operative/keyword-search.js';
import type { RAGFragment, RAGOptions, ScoredChunk } from '../types.js';

export interface DualRetrievalPlan {
  /** True when archive circuit is not queried (operative-only response). */
  skipArchive: boolean;
  /** True when archive circuit should run (index must exist). */
  queryArchive: boolean;
}

export interface DualRetrievalThresholds {
  relevanceThreshold: number;
  minOperativeCount: number;
}

/** Resolve thresholds from config + per-query overrides. */
export function resolveDualRetrievalThresholds(
  config: RagConfig,
  options: RAGOptions,
): DualRetrievalThresholds {
  return {
    relevanceThreshold: config.operativeRelevanceThreshold,
    minOperativeCount: options.minOperativeCount ?? config.minOperativeCount,
  };
}

/** Decide whether to skip LanceDB per brief §5.1. */
export function planDualRetrieval(
  operativeFragments: readonly RAGFragment[],
  options: RAGOptions,
  config: RagConfig,
  hasArchiveIndex: boolean,
): DualRetrievalPlan {
  if (!hasArchiveIndex) {
    return { skipArchive: true, queryArchive: false };
  }

  if (options.useLongTerm) {
    return { skipArchive: false, queryArchive: true };
  }

  const thresholds = resolveDualRetrievalThresholds(config, options);
  const sufficientHits = countSufficientOperativeHits(
    operativeFragments,
    thresholds.relevanceThreshold,
  );
  if (sufficientHits >= thresholds.minOperativeCount) {
    return { skipArchive: true, queryArchive: false };
  }

  return { skipArchive: false, queryArchive: true };
}

/** Apply archive penalties/boosts before merge. */
export function scoreArchiveFragment(
  hit: ScoredChunk,
  config: RagConfig,
  options: RAGOptions,
): RAGFragment {
  let score = hit.score * config.longTermPenalty;
  if (options.historical && hit.metadata.isHistorical) {
    score *= 2;
  }
  return {
    text: hit.text,
    score,
    circuit: 'archive',
    metadata: hit.metadata,
  };
}

/** Merge operative + archive fragments and take global top-K. */
export function mergeRetrievalResults(
  operative: readonly RAGFragment[],
  archive: readonly RAGFragment[],
  topK: number,
  options: RAGOptions = {},
): RAGFragment[] {
  if (options.useLongTerm) {
    const rankedArchive = [...archive].sort((a, b) => b.score - a.score);
    const rankedOperative = [...operative].sort((a, b) => b.score - a.score);
    return [...rankedArchive, ...rankedOperative].slice(0, topK);
  }

  return [...operative, ...archive].sort((a, b) => b.score - a.score).slice(0, topK);
}

/** True when any top-K fragment source matches one of the expected path suffixes. */
export function precisionAtK(
  fragments: readonly RAGFragment[],
  expectedSources: readonly string[],
  k = 5,
): boolean {
  const top = fragments.slice(0, k);
  return top.some((fragment) =>
    expectedSources.some((expected) => fragment.metadata.source.includes(expected)),
  );
}
