/**
 * Состояние загрузки библиотеки (#2570, спринт library-loading-state-2570).
 *
 * Наблюдение владельца 03.10: до первого ответа сервера модуль показывал «Media-server недоступен ·
 * 0.0 / 100.0 MB» — начальный снимок любого сервиса неотличим от запасного локального. Инварианты
 * резчика: I1 `ready` ⇔ был успешный `refresh()` целиком; I3 квота первой, пометка каталога и
 * `ready` — в самом конце; I4 подмена default-сервиса — ровно одна нотификация.
 *
 * Порчи → красный: квота после списков; `ready` до конца списков; пометка каталога до списков
 * (сверка #2569 пропустит перечитывание); подмена без оповещения; временный default исполняет init.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemoryStorageBackend } from '../src/backends/memory-storage-backend.js';
import { createServerStorageBackend } from '../src/backends/server-storage-backend.js';
import { BUFFER_COLLECTION_ID, TARIFF_DATASET_COLLECTION_ID } from '../src/constants.js';
import * as lib from '../src/index.js';
import { createMediaLibraryService } from '../src/media-library-service.js';
import type { IStorageBackend } from '../src/ports/storage-backend.js';
import type { Collection, MediaLibrarySnapshot, MediaSample, StorageQuota } from '../src/types.js';

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

function stubBackend(state: { catalogId: string; failSamples: boolean }) {
  const dataset = [sample('d1', TARIFF_DATASET_COLLECTION_ID), sample('d2', TARIFF_DATASET_COLLECTION_ID)];
  const collections = (): Collection[] => [
    { id: BUFFER_COLLECTION_ID, name: 'Buffer', kind: 'buffer', createdAt: T, updatedAt: T, sampleCount: 0 },
    { id: TARIFF_DATASET_COLLECTION_ID, name: 'Базовый набор', kind: 'system', systemKey: 'tariff-dataset', createdAt: T, updatedAt: T, sampleCount: 2 },
  ];
  const quota = (): StorageQuota => ({
    usedBytes: 486,
    limitBytes: 4096,
    backend: 'server',
    serverReachable: true,
    bufferUsedBytes: 486,
    bufferLimitBytes: 4096,
    dataset: { catalogId: state.catalogId, sampleCount: 2 },
  });
  return {
    ensureReservedCollections: vi.fn(async () => {}),
    listCollections: vi.fn(async () => collections()),
    getQuota: vi.fn(async () => quota()),
    listSamples: vi.fn(async (id: string) => {
      if (state.failSamples) throw new Error('listSamples failed');
      return id === TARIFF_DATASET_COLLECTION_ID ? [...dataset] : [];
    }),
  } as unknown as IStorageBackend & { listSamples: ReturnType<typeof vi.fn>; getQuota: ReturnType<typeof vi.fn> };
}

afterEach(() => {
  lib.resetDefaultMediaLibraryServiceForTests();
});

describe('loadState (#2570)', () => {
  it('P4: серверный сервис до первого чтения — loading, не готовый запасной', () => {
    const svc = createMediaLibraryService(
      createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd', mediaToken: 't' }),
    );
    expect(svc.getSnapshot().loadState).toBe('loading');
  });

  it('I1: после успешного init — ready', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend());
    await svc.init();
    expect(svc.getSnapshot().loadState).toBe('ready');
  });

  it('P6: refresh читает квоту раньше первого списка проб', async () => {
    const backend = stubBackend({ catalogId: 'free-v1-catalog', failSamples: false });
    const order: string[] = [];
    backend.getQuota.mockImplementation(async () => {
      order.push('quota');
      return { usedBytes: 1, limitBytes: 2, backend: 'server', serverReachable: true } as StorageQuota;
    });
    backend.listSamples.mockImplementation(async () => {
      order.push('samples');
      return [];
    });
    await createMediaLibraryService(backend).refresh();
    expect(order[0]).toBe('quota');
    expect(order.indexOf('quota')).toBeLessThan(order.indexOf('samples'));
  });

  it("P6': числа квоты видны во время списков, а снимок ещё loading", async () => {
    const backend = stubBackend({ catalogId: 'free-v1-catalog', failSamples: false });
    const svc = createMediaLibraryService(backend);
    const seen: MediaLibrarySnapshot[] = [];
    backend.listSamples.mockImplementation(async () => {
      seen.push(svc.getSnapshot());
      return [];
    });
    await svc.refresh();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]?.quota.limitBytes).toBe(4096);
    expect(seen[0]?.quota.readAt).toBeDefined();
    expect(seen[0]?.loadState).toBe('loading');
    expect(svc.getSnapshot().loadState).toBe('ready');
  });

  it('P10: сбой списков после квоты — loading остаётся, пометка каталога не ставится', async () => {
    const state = { catalogId: 'free-v1-catalog', failSamples: false };
    const backend = stubBackend(state);
    const svc = createMediaLibraryService(backend);
    await svc.init();
    // Новый сервис со сбоем списков — loading держится.
    const failing = createMediaLibraryService(stubBackend({ catalogId: 'free-v1-catalog', failSamples: true }));
    await expect(failing.refresh()).rejects.toThrow();
    expect(failing.getSnapshot().loadState).toBe('loading');
    // Сменённый каталог прочитан квотой, списки упали: сверка открытия #2569 обязана перечитать набор.
    state.catalogId = 'checkpoint-v1-catalog';
    state.failSamples = true;
    await expect(svc.refresh()).rejects.toThrow();
    state.failSamples = false;
    backend.listSamples.mockClear();
    await svc.reconcileOnOpen();
    expect(backend.listSamples.mock.calls.filter(([id]) => id === TARIFF_DATASET_COLLECTION_ID)).toHaveLength(1);
  });
});

describe('default-сервис до решения моста (#2570)', () => {
  it('временный ленивый default: init не трогает бэкенд, снимок остаётся loading', async () => {
    const svc = lib.getDefaultMediaLibraryService();
    await svc.init();
    expect(svc.getSnapshot().loadState).toBe('loading');
    expect(svc.getSnapshot().collections).toHaveLength(0);
  });

  it('P7/P9: подмена default — ровно одна нотификация, getDefault отдаёт новый; отписка работает', () => {
    const before = lib.getDefaultMediaLibraryService();
    const listener = vi.fn();
    const off = lib.subscribeDefaultMediaLibraryService(listener);
    const next = lib.configureDefaultMediaLibraryService(new MemoryStorageBackend());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(lib.getDefaultMediaLibraryService()).toBe(next);
    expect(next).not.toBe(before);
    off();
    lib.configureDefaultMediaLibraryService(new MemoryStorageBackend());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('сервис, поставленный мостом, — не временный: init исполняется', async () => {
    const svc = lib.configureDefaultMediaLibraryService(new MemoryStorageBackend());
    await svc.init();
    expect(svc.getSnapshot().loadState).toBe('ready');
  });

  it('зуб источника: useMediaLibrary без аргумента следит за подменой default', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const hooks = readFileSync(resolve(here, '../src/hooks.ts'), 'utf8');
    expect(hooks).toMatch(/subscribeDefaultMediaLibraryService/u);
  });
});
