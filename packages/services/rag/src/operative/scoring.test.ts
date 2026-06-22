import { describe, expect, it } from 'vitest';

import {
  applyFreshnessDecay,
  bm25LiteScore,
  keywordHitRate,
  scoreFragment,
  uniqueQueryTerms,
} from './scoring.js';

describe('scoring', () => {
  it('tokenizes and scores keyword overlap', () => {
    const terms = uniqueQueryTerms('background-office port');
    const score = bm25LiteScore(terms, 'background-office listens on port 3000');
    expect(score).toBeGreaterThan(0);
  });

  it('applies freshness decay per brief', () => {
    expect(applyFreshnessDecay(0)).toBe(1.2);
    expect(applyFreshnessDecay(1)).toBe(1.1);
    expect(applyFreshnessDecay(7)).toBe(1.0);
  });

  it('combines base score with boosts', () => {
    const combined = scoreFragment(0.5, 1.2, 1.3);
    expect(combined).toBeCloseTo(0.78);
  });

  it('keyword hit rate reaches 1 when all terms match', () => {
    const terms = uniqueQueryTerms('background-office port');
    expect(keywordHitRate(terms, 'background-office listens on port 3000')).toBe(1);
  });
});
