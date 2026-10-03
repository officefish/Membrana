/**
 * Сверка библиотеки с сервером при открытии модуля (#2569, спринт library-reconcile-on-open-2569).
 *
 * Слово владельца 03.10: коллекции пересматриваются при открытии библиотеки; лёгкая сверка —
 * всегда (ensure-reserved + список коллекций + квота), глубокая — только при смене каталога
 * или досеве и только базовый набор. Буфер на пути открытия не читается никогда.
 *
 * Порчи → красный: открытие без ensure-reserved; список проб буфера на открытии; два
 * параллельных открытия — два залпа; смена каталога не перечитывает базовый набор.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { BUFFER_COLLECTION_ID, TARIFF_DATASET_COLLECTION_ID } from '../src/constants.js';
import { createMediaLibraryService } from '../src/media-library-service.js';
import type { IStorageBackend } from '../src/ports/storage-backend.js';
import type { Collection, MediaSample, StorageQuota } from '../src/types.js';

const T = '2026-10-03T00:00:00.000Z';

function sample(id: string, collectionId: string): MediaSample {
  return {
    id,
    collectionId,
    title: id,
    class: 'drone',
    label: 'unlabeled',
    source: 'mic',
    durationSec: 1,
    sampleRate: 48000,
    channels: 1,
    createdAt: T,
    sizeBytes: 10,
    storageRef: id,
  } as MediaSample;
}

interface ServerState {
  datasetName: string;
  catalogId: string;
  datasetSamples: MediaSample[];
  bufferSamples: MediaSample[];
}

/** Счётный стаб порта: каждый метод — отдельный вызов «сети», без внутренних перекрёстных вызовов. */
function stubBackend(state: ServerState) {
  const collections = (): Collection[] => [
    { id: BUFFER_COLLECTION_ID, name: 'Buffer', kind: 'buffer', createdAt: T, updatedAt: T, sampleCount: state.bufferSamples.length },
    {
      id: TARIFF_DATASET_COLLECTION_ID,
      name: state.datasetName,
      kind: 'system',
      systemKey: 'tariff-dataset',
      createdAt: T,
      updatedAt: T,
      sampleCount: state.datasetSamples.length,
    },
  ];
  const quota = (): StorageQuota => ({
    usedBytes: 1,
    limitBytes: 1000,
    backend: 'server',
    serverReachable: true,
    bufferUsedBytes: 1,
    bufferLimitBytes: 1000,
    dataset: { catalogId: state.catalogId, sampleCount: state.datasetSamples.length },
  });
  const backend = {
    ensureReservedCollections: vi.fn(async () => {}),
    listCollections: vi.fn(async () => collections()),
    getQuota: vi.fn(async () => quota()),
    listSamples: vi.fn(async (id: string) =>
      id === BUFFER_COLLECTION_ID ? [...state.bufferSamples] : id === TARIFF_DATASET_COLLECTION_ID ? [...state.datasetSamples] : [],
    ),
  } as unknown as IStorageBackend & {
    ensureReservedCollections: ReturnType<typeof vi.fn>;
    listCollections: ReturnType<typeof vi.fn>;
    getQuota: ReturnType<typeof vi.fn>;
    listSamples: ReturnType<typeof vi.fn>;
  };
  return backend;
}

function freshState(): ServerState {
  return {
    datasetName: 'Базовый набор (free-v1)',
    catalogId: 'free-v1-catalog',
    datasetSamples: [sample('d1', TARIFF_DATASET_COLLECTION_ID), sample('d2', TARIFF_DATASET_COLLECTION_ID)],
    bufferSamples: [sample('b1', BUFFER_COLLECTION_ID), sample('b2', BUFFER_COLLECTION_ID), sample('b3', BUFFER_COLLECTION_ID)],
  };
}

async function startedService(state = freshState()) {
  const backend = stubBackend(state);
  const svc = createMediaLibraryService(backend);
  await svc.init();
  backend.ensureReservedCollections.mockClear();
  backend.listCollections.mockClear();
  backend.getQuota.mockClear();
  backend.listSamples.mockClear();
  return { state, backend, svc };
}

const listSamplesOf = (backend: { listSamples: ReturnType<typeof vi.fn> }, id: string) =>
  backend.listSamples.mock.calls.filter(([c]) => c === id).length;

describe('reconcileOnOpen (#2569)', () => {
  it('P1: после старта открытие — ensure-reserved 1 раз, списков проб 0', async () => {
    const { backend, svc } = await startedService();
    await svc.reconcileOnOpen();
    expect(backend.ensureReservedCollections).toHaveBeenCalledTimes(1);
    expect(backend.listSamples).toHaveBeenCalledTimes(0);
  });

  it("P1': каталог тот же — ровно три малых запроса: ensure 1, коллекции 1, квота 1", async () => {
    const { backend, svc } = await startedService();
    await svc.reconcileOnOpen();
    expect(backend.ensureReservedCollections).toHaveBeenCalledTimes(1);
    expect(backend.listCollections).toHaveBeenCalledTimes(1);
    expect(backend.getQuota).toHaveBeenCalledTimes(1);
    expect(backend.listSamples).not.toHaveBeenCalled();
  });

  it("P1'': два параллельных открытия (StrictMode) — один залп", async () => {
    const { backend, svc } = await startedService();
    await Promise.all([svc.reconcileOnOpen(), svc.reconcileOnOpen()]);
    expect(backend.ensureReservedCollections).toHaveBeenCalledTimes(1);
    expect(backend.listCollections).toHaveBeenCalledTimes(1);
    expect(backend.getQuota).toHaveBeenCalledTimes(1);
  });

  it("P1''': сервис ещё не инициализирован — один init, второй сверки нет", async () => {
    const backend = stubBackend(freshState());
    const svc = createMediaLibraryService(backend);
    await svc.reconcileOnOpen();
    // init: ensure (runInit) + ensure (refresh) — как на стволе; сверка сверху не добавляет третий.
    expect(backend.ensureReservedCollections).toHaveBeenCalledTimes(2);
    expect(backend.listCollections).toHaveBeenCalledTimes(1);
    await svc.reconcileOnOpen();
    expect(backend.ensureReservedCollections).toHaveBeenCalledTimes(3);
    expect(backend.listCollections).toHaveBeenCalledTimes(2);
  });

  it('P2: имя, сменённое сервером после старта, видно после открытия; пробы снимка не тронуты', async () => {
    const { state, svc } = await startedService();
    const before = svc.getSnapshot().samplesByCollection;
    state.datasetName = 'Базовый набор';
    await svc.reconcileOnOpen();
    const snap = svc.getSnapshot();
    expect(snap.collections.find((c) => c.id === TARIFF_DATASET_COLLECTION_ID)?.name).toBe('Базовый набор');
    expect(snap.samplesByCollection).toBe(before);
  });

  it("P2': досев — sampleCount базового набора вырос: перечитан только он", async () => {
    const { state, backend, svc } = await startedService();
    state.datasetSamples = [...state.datasetSamples, sample('d3', TARIFF_DATASET_COLLECTION_ID)];
    await svc.reconcileOnOpen();
    expect(listSamplesOf(backend, TARIFF_DATASET_COLLECTION_ID)).toBe(1);
    expect(listSamplesOf(backend, BUFFER_COLLECTION_ID)).toBe(0);
    expect(svc.getSnapshot().samplesByCollection[TARIFF_DATASET_COLLECTION_ID]).toHaveLength(3);
  });

  it("P3': каталог сменился — базовый набор перечитан", async () => {
    const { state, backend, svc } = await startedService();
    state.catalogId = 'checkpoint-v1-catalog';
    state.datasetSamples = [sample('c1', TARIFF_DATASET_COLLECTION_ID), sample('c2', TARIFF_DATASET_COLLECTION_ID)];
    await svc.reconcileOnOpen();
    expect(backend.ensureReservedCollections).toHaveBeenCalledTimes(1);
    expect(listSamplesOf(backend, TARIFF_DATASET_COLLECTION_ID)).toBe(1);
    expect(svc.getSnapshot().samplesByCollection[TARIFF_DATASET_COLLECTION_ID]?.map((s) => s.id)).toEqual(['c1', 'c2']);
    expect(svc.getSnapshot().quota.dataset?.catalogId).toBe('checkpoint-v1-catalog');
  });

  it("P3'': каталог сменился — список проб буфера не читается", async () => {
    const { state, backend, svc } = await startedService();
    state.catalogId = 'checkpoint-v1-catalog';
    await svc.reconcileOnOpen();
    expect(listSamplesOf(backend, BUFFER_COLLECTION_ID)).toBe(0);
  });

  it("P3''': каталог сменился и тик моста (refreshQuota) успел его прочитать — базовый набор всё равно перечитан", async () => {
    const { state, backend, svc } = await startedService();
    state.catalogId = 'checkpoint-v1-catalog';
    await svc.refreshQuota();
    expect(svc.getSnapshot().quota.dataset?.catalogId).toBe('checkpoint-v1-catalog');
    await svc.reconcileOnOpen();
    expect(listSamplesOf(backend, TARIFF_DATASET_COLLECTION_ID)).toBe(1);
  });

  it('каталог тот же при втором открытии — глубокой ветки нет', async () => {
    const { state, backend, svc } = await startedService();
    state.catalogId = 'checkpoint-v1-catalog';
    await svc.reconcileOnOpen();
    backend.listSamples.mockClear();
    await svc.reconcileOnOpen();
    expect(backend.listSamples).not.toHaveBeenCalled();
  });

  it('зуб источника: хук useMediaLibrary сверку не зовёт (её зовут 5 панелей и кабинет)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const hooks = readFileSync(resolve(here, '../src/hooks.ts'), 'utf8');
    expect(hooks).not.toMatch(/reconcileOnOpen/u);
  });
});
