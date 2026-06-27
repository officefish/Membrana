import { describe, expect, it } from 'vitest';

import { loadRagConfig, RAG_CONFIG_DEFAULTS } from './config.js';
import { keywordSearch } from './operative/keyword-search.js';
import { findMonorepoRoot } from './repo-root.js';
import { formatFragmentsForPrompt, RagService, retrieveContext } from './service.js';

const REPO_ROOT = findMonorepoRoot();

describe('loadRagConfig', () => {
  it('uses documented defaults when env is empty', () => {
    const config = loadRagConfig({});
    expect(config.embeddingModel).toBe('text-embedding-3-small');
    expect(config.vectorStore).toBe('lancedb');
    expect(config.lanceDbPath).toBe('.membrana/rag/');
    expect(config.topK).toBe(RAG_CONFIG_DEFAULTS.topK);
    expect(config.archiveTopK).toBe(15);
  });

  it('maps legacy OBSIDIAN env names to operative thresholds', () => {
    const config = loadRagConfig({
      RAG_OBSIDIAN_RELEVANCE_THRESHOLD: '0.75',
      RAG_MIN_OBSIDIAN_COUNT: '4',
    });
    expect(config.operativeRelevanceThreshold).toBe(0.75);
    expect(config.minOperativeCount).toBe(4);
  });
});

describe('archive topK', () => {
  it('uses archiveTopK without changing the operative default', async () => {
    let requestedTopK = 0;
    const service = new RagService({
      config: loadRagConfig({ RAG_TOP_K_ARCHIVE: '17' }),
      repoRoot: REPO_ROOT,
      archivePort: {
        hasIndex: async () => true,
        search: async (_query, topK) => {
          requestedTopK = topK;
          return [];
        },
      },
    });
    await service.retrieveContext('Membrana', { useLongTerm: true });
    expect(service.config.topK).toBe(5);
    expect(requestedTopK).toBe(17);
  });
});

describe('retrieveContext (R1 archive)', () => {
  it('returns operative hits when index is missing', async () => {
    const service = new RagService({
      config: loadRagConfig({}),
      repoRoot: REPO_ROOT,
    });
    const result = await service.retrieveContext('Membrana');
    expect(result.query).toBe('Membrana');
    expect(result.usedArchive).toBe(false);
    if (result.fragments.length > 0) {
      expect(result.usedOperative).toBe(true);
      expect(result.fragments[0]?.circuit).toBe('operative');
    }
  });

  it('returns empty archive flag when index is missing', async () => {
    const service = new RagService({
      config: loadRagConfig({}),
      repoRoot: REPO_ROOT,
    });
    const result = await service.retrieveContext('background-office port');
    expect(result.query).toBe('background-office port');
    expect(result.usedArchive).toBe(false);
  });

  it('returns empty query result for whitespace-only input', async () => {
    const result = await retrieveContext('   ');
    expect(result.query).toBe('');
    expect(result.fragments).toEqual([]);
  });
});

describe('keywordSearch (R2 operative)', () => {
  it('returns operative fragments without LanceDB', async () => {
    const fragments = await keywordSearch(REPO_ROOT, 'Membrana', {
      days: 30,
      topK: 3,
    });
    expect(fragments.length).toBeGreaterThan(0);
    expect(fragments.every((fragment) => fragment.circuit === 'operative')).toBe(true);
  });
});

describe('formatFragmentsForPrompt', () => {
  it('explains missing index', () => {
    const text = formatFragmentsForPrompt({
      query: 'test',
      fragments: [],
      usedArchive: false,
      usedOperative: false,
    });
    expect(text).toContain('yarn rag:index --full');
  });
});
