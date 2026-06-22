import { describe, expect, it } from 'vitest';

import { loadRagConfig } from '../config.js';
import type { RAGFragment } from '../types.js';
import {
  mergeRetrievalResults,
  planDualRetrieval,
  precisionAtK,
  scoreArchiveFragment,
} from './dual-retriever.js';

function operativeFragment(score: number, source = 'docs/CURRENT_TASK.md'): RAGFragment {
  return {
    text: `operative ${source}`,
    score,
    circuit: 'operative',
    metadata: {
      source,
      type: 'operative',
      timestamp: new Date().toISOString(),
      tags: [],
      priority: 1.3,
      chunkIndex: 0,
      isHistorical: false,
      status: 'active',
    },
  };
}

describe('planDualRetrieval', () => {
  const config = loadRagConfig({
    RAG_OPERATIVE_RELEVANCE_THRESHOLD: '0.6',
    RAG_MIN_OPERATIVE_COUNT: '3',
  });

  it.each([
    {
      name: 'skips archive when operative hits are sufficient',
      fragments: [operativeFragment(0.7), operativeFragment(0.65), operativeFragment(0.62)],
      options: {},
      hasIndex: true,
      expected: { skipArchive: true, queryArchive: false },
    },
    {
      name: 'queries archive when operative hits are below min count',
      fragments: [operativeFragment(0.8), operativeFragment(0.7)],
      options: {},
      hasIndex: true,
      expected: { skipArchive: false, queryArchive: true },
    },
    {
      name: 'queries archive when scores are below threshold',
      fragments: [operativeFragment(0.5), operativeFragment(0.4), operativeFragment(0.3)],
      options: {},
      hasIndex: true,
      expected: { skipArchive: false, queryArchive: true },
    },
    {
      name: 'forces archive when useLongTerm is set',
      fragments: [operativeFragment(0.9), operativeFragment(0.85), operativeFragment(0.8)],
      options: { useLongTerm: true },
      hasIndex: true,
      expected: { skipArchive: false, queryArchive: true },
    },
    {
      name: 'skips archive when index is missing',
      fragments: [operativeFragment(0.2)],
      options: {},
      hasIndex: false,
      expected: { skipArchive: true, queryArchive: false },
    },
  ])('$name', ({ fragments, options, hasIndex, expected }) => {
    expect(planDualRetrieval(fragments, options, config, hasIndex)).toEqual(expected);
  });
});

describe('mergeRetrievalResults', () => {
  it('sorts by score and limits to topK', () => {
    const merged = mergeRetrievalResults(
      [operativeFragment(0.4, 'docs/A.md')],
      [
        {
          text: 'archive hit',
          score: 0.9,
          circuit: 'archive',
          metadata: operativeFragment(0).metadata,
        },
      ],
      2,
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]?.circuit).toBe('archive');
    expect(merged[0]?.score).toBe(0.9);
  });
});

describe('scoreArchiveFragment', () => {
  it('applies longTermPenalty and historical boost', () => {
    const config = loadRagConfig({ RAG_LONG_TERM_PENALTY: '0.9' });
    const base = {
      text: 'historical note',
      score: 1,
      metadata: {
        source: 'docs/archive/daily-day/2026-01-01/x.md',
        type: 'archive' as const,
        timestamp: '2026-01-01T00:00:00.000Z',
        tags: [],
        priority: 0.5,
        chunkIndex: 0,
        isHistorical: true,
        status: 'archived' as const,
      },
    };

    const penalized = scoreArchiveFragment(base, config, {});
    expect(penalized.score).toBeCloseTo(0.9);

    const boosted = scoreArchiveFragment(base, config, { historical: true });
    expect(boosted.score).toBeCloseTo(1.8);
  });
});

describe('precisionAtK', () => {
  it('detects expected source in top fragments', () => {
    const fragments = [
      operativeFragment(0.2, 'docs/noise.md'),
      {
        text: 'ports',
        score: 0.95,
        circuit: 'archive' as const,
        metadata: {
          ...operativeFragment(0).metadata,
          source: 'docs/BACKGROUND_SERVERS.md',
        },
      },
    ];
    expect(precisionAtK(fragments, ['BACKGROUND_SERVERS.md'], 5)).toBe(true);
  });
});
