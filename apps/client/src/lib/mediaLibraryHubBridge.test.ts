import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BUFFER_COLLECTION_ID,
  createMediaLibraryService,
  MemoryStorageBackend,
  resetDefaultMediaLibraryServiceForTests,
  setDefaultMediaLibraryServiceForTests,
} from '@membrana/media-library-service';

import {
  publishMediaLibraryCaptureStop,
  resetMediaLibraryHubForTests,
} from './mediaLibraryHub';
import { initMediaLibraryHubBridge, resetMediaLibraryHubBridgeForTests } from './mediaLibraryHubBridge';

describe('mediaLibraryHubBridge', () => {
  afterEach(() => {
    resetMediaLibraryHubForTests();
    resetMediaLibraryHubBridgeForTests();
    resetDefaultMediaLibraryServiceForTests();
  });

  it('imports blob into buffer on capture.stop', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1024 * 1024 });
    const svc = createMediaLibraryService(backend);
    setDefaultMediaLibraryServiceForTests(svc);

    initMediaLibraryHubBridge();
    await svc.init();

    publishMediaLibraryCaptureStop({
      reason: 'user',
      sourcePluginId: 'mic-buffer-recorder',
      blob: new Blob(['wav-data'], { type: 'audio/wav' }),
      meta: {
        title: 'clip',
        class: 'unlabeled',
        label: 'unlabeled',
        durationSec: 1.5,
        sampleRate: 48_000,
        channels: 1,
      },
    });

    await vi.waitFor(() => {
      const samples = svc.getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
      expect(samples.length).toBe(1);
    });

    const sample = svc.getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID]?.[0];
    expect(sample?.title).toBe('clip');
    expect(sample?.source).toBe('mic-recording');
  });
});
