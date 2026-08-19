import { beforeAll, describe, expect, it } from 'vitest';

import { loadRagConfig } from '../config.js';
import { findMonorepoRoot } from '../repo-root.js';
import { RagService } from '../service.js';
import { precisionAtK } from './dual-retriever.js';
import { createKeywordCorpusArchivePort } from './keyword-corpus-archive.js';

const REPO_ROOT = findMonorepoRoot();

/** CRITICAL_RAG_AUDIT.md §10 — gate: P@5 on expected source path. */
/**
 * Часы — метрика, не вердикт (диагноз Дынина 19.08, спринт contour-sanity): один запрос по живому
 * корпусу стоит 7–8 с (git log за 30 дней + 2,5 тыс. документов) и растёт с репозиторием; порог
 * 8 000 мс трижды поднимали (24.06, 29.06, cg1) и он снова пробит. Время печатается всегда,
 * а валит тест только по явному слову: RAG_ACCEPTANCE_TIMING_MS=<порог>.
 */
const TIMING_GATE_MS = Number.parseInt(process.env.RAG_ACCEPTANCE_TIMING_MS ?? '', 10);
const ACCEPTANCE_CASES = [
  {
    query: 'background-office background-media port 3000 3010',
    expectedSources: [
      'BACKGROUND_SERVERS.md',
      'readme-background-servers-table',
      'strategic-docs/releases/readme-main',
    ],
  },
  {
    query: 'Web Audio getUserMedia AudioContext createAnalyser запрещён',
    expectedSources: ['ARCHITECTURE.md', '.cursorrules'],
  },
  {
    query: 'task closure regulation archive close-github LGTM',
    expectedSources: ['TASK_CLOSURE_REGULATION.md'],
  },
  {
    query: 'Stop rules 2 падениях CI подряд night:close handoff',
    expectedSources: ['NIGHT_SPRINT_REGULATION.md'],
  },
  {
    query: 'audio-engine plugins microphoneStreamHub INTEGRATIONS analyzer',
    expectedSources: ['INTEGRATIONS_STRATEGY.md'],
  },
] as const;

describe('acceptance benchmark (keyword corpus archive, no API key)', () => {
  let service: RagService;

  beforeAll(async () => {
    const config = loadRagConfig({});
    const archivePort = await createKeywordCorpusArchivePort(REPO_ROOT);
    service = new RagService({
      repoRoot: REPO_ROOT,
      config,
      archivePort,
    });
  }, 120_000);

  it.each(ACCEPTANCE_CASES)('P@5: $query', async ({ query, expectedSources }) => {
    const started = performance.now();
    const result = await service.retrieveContext(query, { useLongTerm: true, topK: 5 });
    const elapsedMs = performance.now() - started;

    expect(result.usedArchive).toBe(true);
    expect(precisionAtK(result.fragments, expectedSources, 5)).toBe(true);
    console.info(`[rag acceptance] P@5 ok · ${Math.round(elapsedMs)} ms · «${query}»`);
    if (Number.isFinite(TIMING_GATE_MS)) expect(elapsedMs).toBeLessThan(TIMING_GATE_MS);
  }, 60_000);
});

describe('dual retriever routing', () => {
  it('returns operative-only when hits are sufficient and useLongTerm is false', async () => {
    // corpus scan may take a few seconds; explicit timeout since config testTimeout is 5s
    const config = loadRagConfig({
      RAG_OPERATIVE_RELEVANCE_THRESHOLD: '0.01',
      RAG_MIN_OPERATIVE_COUNT: '1',
    });
    const archivePort = await createKeywordCorpusArchivePort(REPO_ROOT);
    const service = new RagService({
      repoRoot: REPO_ROOT,
      config,
      archivePort,
    });

    const result = await service.retrieveContext('Membrana', { topK: 5 });
    expect(result.usedOperative).toBe(true);
    expect(result.usedArchive).toBe(false);
    expect(result.fragments.every((fragment) => fragment.circuit === 'operative')).toBe(true);
  });
});
