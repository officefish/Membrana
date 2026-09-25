import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadRagConfig, RAG_CONFIG_DEFAULTS } from './config.js';
import { keywordSearch } from './operative/keyword-search.js';
import { formatFragmentsForPrompt, RagService, retrieveContext } from './service.js';

describe('loadRagConfig', () => {
  it('uses documented defaults when env is empty', () => {
    const config = loadRagConfig({});
    expect(config.embeddingModel).toBe('text-embedding-3-small');
    expect(config.vectorStore).toBe('lancedb');
    expect(config.lanceDbPath).toBe('.membrana/rag/');
    expect(config.topK).toBe(RAG_CONFIG_DEFAULTS.topK);
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

describe('retrieveContext (R1 archive)', () => {
  // Корпус-фикстура вместо живого репозитория — та же болезнь и то же лечение, что
  // у соседнего describe 19.08: retrieveContext идёт в operative-контур, а тот стоит
  // git log за 30 дней плюс обход дерева. На живом репозитории это росло вместе с
  // репозиторием и 25.09 пробило testTimeout 30 с — ночь на стволе стала красной,
  // причём тест не сказал «не сошлось», а замолчал на полминуты и умер по таймеру.
  // Здесь проверяется ПОВЕДЕНИЕ retrieveContext без индекса, а не скорость диска.
  let fixtureRoot = '';

  beforeAll(async () => {
    fixtureRoot = await mkdtemp(join(tmpdir(), 'rag-archive-'));
    await mkdir(join(fixtureRoot, 'docs'), { recursive: true });
    await writeFile(
      join(fixtureRoot, 'docs', 'MAIN_DAY_ISSUE.md'),
      '# Main day issue\n\nMembrana — магистраль дня: Membrana plugin host, Membrana collections.\n',
      'utf8',
    );
  });

  afterAll(async () => {
    await rm(fixtureRoot, { recursive: true, force: true });
  });

  it('returns operative hits when index is missing', async () => {
    const service = new RagService({
      config: loadRagConfig({}),
      repoRoot: fixtureRoot,
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
      repoRoot: fixtureRoot,
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
  // Корпус-фикстура вместо живого репозитория (диагноз Дынина 19.08, спринт contour-sanity):
  // на живом дереве keywordSearch стоит git log за 30 дней (≈7 с, 868 коммитов) + 2,5 тыс. stat/read —
  // под параллельным turbo тест пробивал testTimeout 30 с. Здесь проверяется ФУНКЦИЯ
  // (operative-фрагменты без LanceDB), а не скорость диска; скорость живого корпуса меряет acceptance.
  let fixtureRoot = '';

  beforeAll(async () => {
    fixtureRoot = await mkdtemp(join(tmpdir(), 'rag-operative-'));
    await mkdir(join(fixtureRoot, 'docs'), { recursive: true });
    await writeFile(
      join(fixtureRoot, 'docs', 'MAIN_DAY_ISSUE.md'),
      '# Main day issue\n\nMembrana — магистраль дня: Membrana plugin host, Membrana collections.\n',
      'utf8',
    );
    await writeFile(
      join(fixtureRoot, 'docs', 'DAILY_CODE_REVIEW.md'),
      '# Review\n\nMembrana review of the day.\n',
      'utf8',
    );
  });

  afterAll(async () => {
    await rm(fixtureRoot, { recursive: true, force: true });
  });

  it('returns operative fragments without LanceDB', async () => {
    const fragments = await keywordSearch(fixtureRoot, 'Membrana', {
      days: 30,
      topK: 3,
    });
    expect(fragments.length).toBeGreaterThan(0);
    expect(fragments.every((fragment) => fragment.circuit === 'operative')).toBe(true);
    expect(fragments.map((fragment) => fragment.metadata.source)).toContain(
      'docs/MAIN_DAY_ISSUE.md',
    );
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
