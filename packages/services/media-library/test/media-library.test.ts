import { describe, expect, it, vi } from 'vitest';

import {
  BUFFER_COLLECTION_ID,
  TARIFF_DATASET_COLLECTION_ID,
} from '../src/constants.js';
import { MemoryStorageBackend } from '../src/backends/memory-storage-backend.js';
import { seedBundledCatalogIfEmpty } from '../src/bundled-catalog.js';
import { createMediaLibraryService } from '../src/media-library-service.js';
import { DEFAULT_MEDIA_LIBRARY_CONFIG } from '../src/constants.js';
import { getQuotaLevel, isQuotaFull, isQuotaWarning, resolveMediaLibraryStorageMode, isBufferRecordingBlocked, resolveBufferQuota } from '../src/quota-status.js';

describe('quota-status', () => {
  it('detects warning and full levels', () => {
    expect(getQuotaLevel({ usedBytes: 50, limitBytes: 100, backend: 'browser-limited', serverReachable: false })).toBe('ok');
    expect(getQuotaLevel({ usedBytes: 91, limitBytes: 100, backend: 'browser-limited', serverReachable: false })).toBe('warning');
    expect(getQuotaLevel({ usedBytes: 100, limitBytes: 100, backend: 'browser-limited', serverReachable: false })).toBe('full');
    expect(isQuotaFull({ usedBytes: 100, limitBytes: 100, backend: 'browser-limited', serverReachable: false })).toBe(true);
    expect(isQuotaWarning({ usedBytes: 91, limitBytes: 100, backend: 'browser-limited', serverReachable: false })).toBe(true);
  });

  it('resolves storage mode from quota backend', () => {
    expect(
      resolveMediaLibraryStorageMode({
        usedBytes: 0,
        limitBytes: 100,
        backend: 'browser-limited',
        serverReachable: false,
      }),
    ).toBe('browser-limited-fallback');
    expect(
      resolveMediaLibraryStorageMode({
        usedBytes: 0,
        limitBytes: 100,
        backend: 'server',
        serverReachable: true,
      }),
    ).toBe('remote-server');
    expect(
      resolveMediaLibraryStorageMode({
        usedBytes: 0,
        limitBytes: 100,
        backend: 'server',
        serverReachable: false,
      }),
    ).toBe('remote-server');
  });

  it('uses buffer quota fields for recorder gating', () => {
    const quota = {
      usedBytes: 0,
      limitBytes: 1_000_000,
      backend: 'server' as const,
      serverReachable: true,
      bufferUsedBytes: 100,
      bufferLimitBytes: 100,
    };
    expect(resolveBufferQuota(quota)).toEqual({ usedBytes: 100, limitBytes: 100 });
    expect(isBufferRecordingBlocked(quota, 0, 10)).toBe(true);
    expect(isBufferRecordingBlocked(quota, 10, 10)).toBe(true);
  });
});

describe('MediaLibraryService', () => {
  it('seeds buffer and tariff dataset collections', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend({ limitBytes: 1_000_000 }));
    await svc.init();
    const ids = svc.getSnapshot().collections.map((c) => c.id);
    expect(ids).toContain(BUFFER_COLLECTION_ID);
    expect(ids).toContain(TARIFF_DATASET_COLLECTION_ID);
  });

  it('deduplicates concurrent init calls', async () => {
    const ensureReservedCollections = vi.fn(async () => {});
    const backend = {
      ensureReservedCollections,
      listCollections: vi.fn(async () => []),
      listSamples: vi.fn(async () => []),
      getQuota: vi.fn(async () => ({
        usedBytes: 0,
        limitBytes: 1_000_000,
        backend: 'browser-limited' as const,
        serverReachable: false,
      })),
    } as unknown as import('../src/ports/storage-backend.js').IStorageBackend;

    const svc = createMediaLibraryService(backend);
    await Promise.all([svc.init(), svc.init(), svc.init()]);
    expect(ensureReservedCollections).toHaveBeenCalledTimes(2);
  });

  it('forbids deleting reserved collections', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend());
    await svc.init();
    await expect(svc.deleteUserCollection(TARIFF_DATASET_COLLECTION_ID)).rejects.toThrow();
    await expect(svc.deleteUserCollection(BUFFER_COLLECTION_ID)).rejects.toThrow();
  });

  it('imports blob and moves between user collections', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend({ limitBytes: 1_000_000 }));
    await svc.init();
    const user = await svc.createUserCollection('field');
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    const sample = await svc.importBlob(BUFFER_COLLECTION_ID, blob, {
      title: 'test',
      class: 'wind',
      label: 'not-drone',
      source: 'disk-import',
      durationSec: 1,
      sampleRate: 48000,
    });
    expect(sample.collectionId).toBe(BUFFER_COLLECTION_ID);
    const moved = await svc.moveSample(sample.id, user.id);
    expect(moved.collectionId).toBe(user.id);
    expect(svc.getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID]).toHaveLength(0);
  });

  it('reads sample blob via getSampleBlob', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1_000_000 });
    const svc = createMediaLibraryService(backend);
    await svc.init();
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const sample = await svc.importBlob(BUFFER_COLLECTION_ID, new Blob([bytes], { type: 'audio/wav' }), {
      title: 'blob-test',
      class: 'unlabeled',
      label: 'unlabeled',
      source: 'disk-import',
      durationSec: 1,
      sampleRate: 48000,
    });
    const blob = await svc.getSampleBlob(sample.id);
    const out = new Uint8Array(await blob.arrayBuffer());
    expect(out).toEqual(bytes);
  });

  it('forbids upload and move into tariff dataset', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1_000_000 });
    const svc = createMediaLibraryService(backend);
    await svc.init();
    const blob = new Blob([new Uint8Array(64)], { type: 'audio/wav' });
    const sample = await svc.importBlob(BUFFER_COLLECTION_ID, blob, {
      title: 'x',
      class: 'wind',
      label: 'not-drone',
      source: 'disk-import',
      durationSec: 1,
      sampleRate: 48000,
    });
    await expect(svc.moveSample(sample.id, TARIFF_DATASET_COLLECTION_ID)).rejects.toThrow();
    await expect(
      svc.importBlob(TARIFF_DATASET_COLLECTION_ID, blob, {
        title: 'bad',
        class: 'wind',
        label: 'not-drone',
        source: 'disk-import',
        durationSec: 1,
        sampleRate: 48000,
      }),
    ).rejects.toThrow();
  });

  it('enforces quota (catalog samples excluded)', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend({ limitBytes: 50 }));
    await svc.init();
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    await expect(
      svc.importBlob(BUFFER_COLLECTION_ID, blob, {
        title: 'big',
        class: 'x',
        label: 'unlabeled',
        source: 'disk-import',
        durationSec: 1,
        sampleRate: 48000,
      }),
    ).rejects.toThrow();
  });

  it('enforces buffer sample limit', async () => {
    const svc = createMediaLibraryService(
      new MemoryStorageBackend({ limitBytes: 1_000_000 }),
      { maxBufferSamples: 2 },
    );
    await svc.init();
    const blob = new Blob([new Uint8Array(10)], { type: 'audio/wav' });
    const meta = {
      title: 'x',
      class: 'wind',
      label: 'unlabeled' as const,
      source: 'disk-import' as const,
      durationSec: 1,
      sampleRate: 48000,
    };
    await svc.importBlob(BUFFER_COLLECTION_ID, blob, meta);
    await svc.importBlob(BUFFER_COLLECTION_ID, blob, meta);
    await expect(svc.importBlob(BUFFER_COLLECTION_ID, blob, meta)).rejects.toThrow();
    expect(DEFAULT_MEDIA_LIBRARY_CONFIG.maxBufferSamples).toBeGreaterThan(2);
  });
});

describe('bundled catalog seed', () => {
  it('seeds 120 samples from v0.2 manifest when dataset exists', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 512 * 1024 * 1024 });
    const count = await seedBundledCatalogIfEmpty(backend);
    if (count === 0) {
      return;
    }
    expect(count).toBe(120);
    const samples = await backend.listSamples(TARIFF_DATASET_COLLECTION_ID);
    expect(samples).toHaveLength(120);
    const quota = await backend.getQuota();
    expect(quota.usedBytes).toBe(0);
  });
});
