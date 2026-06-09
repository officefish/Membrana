import { describe, expect, it } from 'vitest';

import {
  BUFFER_COLLECTION_ID,
  SYSTEM_BENCHMARK_COLLECTION_ID,
} from '../src/constants.js';
import { MemoryStorageBackend } from '../src/backends/memory-storage-backend.js';
import { createMediaLibraryService } from '../src/media-library-service.js';

describe('MediaLibraryService', () => {
  it('seeds buffer and system collections', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend({ limitBytes: 1_000_000 }));
    await svc.init();
    const ids = svc.getSnapshot().collections.map((c) => c.id);
    expect(ids).toContain(BUFFER_COLLECTION_ID);
    expect(ids).toContain(SYSTEM_BENCHMARK_COLLECTION_ID);
  });

  it('forbids deleting system collection', async () => {
    const svc = createMediaLibraryService(new MemoryStorageBackend());
    await svc.init();
    await expect(svc.deleteUserCollection(SYSTEM_BENCHMARK_COLLECTION_ID)).rejects.toThrow();
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
});
