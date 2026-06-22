/**
 * Operative scoring — BM25-lite + freshness decay (no embeddings).
 */

const TOKEN_PATTERN = /[\p{L}\p{N}_-]+/gu;

export function tokenizeForSearch(text: string): string[] {
  const lower = text.toLowerCase();
  const matches = lower.match(TOKEN_PATTERN);
  return matches ?? [];
}

export function uniqueQueryTerms(query: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const token of tokenizeForSearch(query)) {
    if (token.length < 2 || seen.has(token)) {
      continue;
    }
    seen.add(token);
    terms.push(token);
  }
  return terms;
}

/** Normalized term-frequency score in [0, 1]. */
export function bm25LiteScore(queryTerms: readonly string[], documentText: string): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  const docTokens = tokenizeForSearch(documentText);
  if (docTokens.length === 0) {
    return 0;
  }

  const frequencies = new Map<string, number>();
  for (const token of docTokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  let hitWeight = 0;
  for (const term of queryTerms) {
    const freq = frequencies.get(term) ?? 0;
    if (freq > 0) {
      hitWeight += freq / docTokens.length;
    }
  }

  return hitWeight / queryTerms.length;
}

/** Share of query terms present in document — reaches 1.0 when all terms match. */
export function keywordHitRate(queryTerms: readonly string[], documentText: string): number {
  if (queryTerms.length === 0) {
    return 0;
  }
  const lower = documentText.toLowerCase();
  let hits = 0;
  for (const term of queryTerms) {
    if (lower.includes(term)) {
      hits += 1;
    }
  }
  return hits / queryTerms.length;
}

/** Operative ranking base — max of hit rate and BM25-lite TF (see brief §3.3). */
export function operativeBaseScore(queryTerms: readonly string[], documentText: string): number {
  return Math.max(keywordHitRate(queryTerms, documentText), bm25LiteScore(queryTerms, documentText));
}

/** Boost when query terms appear in the markdown filename (e.g. TASK_CLOSURE_REGULATION). */
export function filenameMatchBoost(sourcePath: string, queryTerms: readonly string[]): number {
  const fileName = sourcePath.split('/').pop()?.replace(/\.md$/i, '') ?? '';
  const fileTerms = tokenizeForSearch(fileName.replace(/_/g, '-'));
  if (queryTerms.length === 0 || fileTerms.length === 0) {
    return 1;
  }

  let matched = 0;
  for (const queryTerm of queryTerms) {
    if (
      fileTerms.some(
        (fileTerm) => fileTerm.includes(queryTerm) || queryTerm.includes(fileTerm),
      )
    ) {
      matched += 1;
    }
  }

  return 1 + matched / queryTerms.length;
}

export function daysAgo(from: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - from.getTime();
  if (diffMs <= 0) {
    return 0;
  }
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Freshness boost: today ×1.2, yesterday ×1.1, linear decay to 1.0 at `windowDays`.
 */
export function applyFreshnessDecay(daysOld: number, windowDays = 7): number {
  if (daysOld <= 0) {
    return 1.2;
  }
  if (daysOld <= 1) {
    return 1.1;
  }
  if (daysOld >= windowDays) {
    return 1.0;
  }

  const span = windowDays - 1;
  const progress = (daysOld - 1) / span;
  return 1.1 - progress * 0.1;
}

export function scoreFragment(
  baseScore: number,
  freshnessMultiplier: number,
  pathBoost: number,
): number {
  return baseScore * freshnessMultiplier * pathBoost;
}
