import { describe, expect, it } from 'vitest';

import {
  BUFFER_COLLECTION_ID,
  SYSTEM_BENCHMARK_COLLECTION_ID,
} from '../src/constants.js';
import { MemoryStorageBackend } from '../src/backends/memory-storage-backend.js';
import { createMediaLibraryService } from '../src/media-library-service.js';
import { DEFAULT_MEDIA_LIBRARY_CONFIG } from '../src/constants.js';
import { getQuotaLevel, isQuotaFull, isQuotaWarning, resolveMediaLibraryStorageMode } from '../src/quota-status.js';

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
  });
});

describe('MediaLibraryService', () => {
  it('seeds buffer and system collections', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend({ limitBytes: 1_000_000 }));
    await svc.init();
    const ids = svc.getSnapshot().collections.map((c) => c.id);
    expect(ids).toContain(BUFFER_COLLECTION_ID);
    expect(ids).toContain(SYSTEM_BENCHMARK_COLLECTION_ID);
  });

  it('forbids deleting reserved collections', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend());
    await svc.init();
    await expect(svc.deleteUserCollection(SYSTEM_BENCHMARK_COLLECTION_ID)).rejects.toThrow();
    await expect(svc.deleteUserCollection(BUFFER_COLLECTION_ID)).rejects.toThrow();
  });

  it('imports blob and moves between collections', async () => {
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

  it('moves from buffer to system benchmark collection', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend({ limitBytes: 1_000_000 }));
    await svc.init();
    const blob = new Blob([new Uint8Array(64)], { type: 'audio/wav' });
    const sample = await svc.importBlob(BUFFER_COLLECTION_ID, blob, {
      title: 'bench-candidate',
      class: 'drone-multirotor',
      label: 'drone',
      source: 'disk-import',
      durationSec: 2,
      sampleRate: 48000,
    });
    const moved = await svc.moveSample(sample.id, SYSTEM_BENCHMARK_COLLECTION_ID);
    expect(moved.collectionId).toBe(SYSTEM_BENCHMARK_COLLECTION_ID);
    expect(svc.getSnapshot().samplesByCollection[SYSTEM_BENCHMARK_COLLECTION_ID]).toHaveLength(1);
  });

  it('enforces quota', async () => {
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
