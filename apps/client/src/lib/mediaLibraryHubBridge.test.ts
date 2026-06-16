import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BUFFER_COLLECTION_ID,
  createMediaLibraryService,
  getDefaultMediaLibraryService,
  MemoryStorageBackend,
  resetDefaultMediaLibraryServiceForTests,
  setDefaultMediaLibraryServiceForTests,
} from '@membrana/media-library-service';

import {
  publishMediaLibraryCaptureStop,
  resetMediaLibraryHubForTests,
  subscribeMediaLibraryBufferCleared,
} from './mediaLibraryHub';
import {
  initMediaLibraryHubBridge,
  requestClearMediaLibraryBuffer,
  resetMediaLibraryHubBridgeForTests,
} from './mediaLibraryHubBridge';
import { resolveMediaLibraryBackend } from './resolveMediaLibraryBackend';

vi.mock('./resolveMediaLibraryBackend', () => ({
  resolveMediaLibraryBackend: vi.fn(),
}));

describe('mediaLibraryHubBridge', () => {
  afterEach(() => {
    resetMediaLibraryHubForTests();
    resetMediaLibraryHubBridgeForTests();
    resetDefaultMediaLibraryServiceForTests();
    vi.mocked(resolveMediaLibraryBackend).mockReset();
  });

  it('imports blob into buffer on capture.stop', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1024 * 1024 });
    vi.mocked(resolveMediaLibraryBackend).mockResolvedValue(backend);
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
      const active = getDefaultMediaLibraryService();
      const samples = active.getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
      expect(samples.length).toBe(1);
    });

    const sample = getDefaultMediaLibraryService().getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID]?.[0];
    expect(sample?.title).toBe('clip');
    expect(sample?.source).toBe('mic-recording');
  });

  it('clears buffer and publishes bufferCleared hub event', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1024 * 1024 });
    vi.mocked(resolveMediaLibraryBackend).mockResolvedValue(backend);
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
      expect(
        getDefaultMediaLibraryService().getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID]?.length,
      ).toBe(1);
    });

    let bufferCleared = false;
    subscribeMediaLibraryBufferCleared(() => {
      bufferCleared = true;
    });

    await requestClearMediaLibraryBuffer();

    expect(bufferCleared).toBe(true);
    const samples =
      getDefaultMediaLibraryService().getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
    expect(samples.length).toBe(0);
  });
});
