import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  publishMediaLibraryCaptureStop,
  publishMediaLibraryQuotaUpdated,
  resetMediaLibraryHubForTests,
  subscribeMediaLibraryCaptureStop,
  subscribeMediaLibraryQuotaUpdated,
} from './mediaLibraryHub';

describe('mediaLibraryHub', () => {
  afterEach(() => {
    resetMediaLibraryHubForTests();
  });

  it('notifies capture.stop subscribers', () => {
    const listener = vi.fn();
    const unsub = subscribeMediaLibraryCaptureStop(listener);

    publishMediaLibraryCaptureStop({
      reason: 'user',
      sourcePluginId: 'mic-buffer-recorder',
      blob: new Blob(['x']),
      meta: {
        title: 'test',
        class: 'unlabeled',
        label: 'unlabeled',
        source: 'mic-recording',
        durationSec: 1,
        sampleRate: 48_000,
      },
    });

    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('notifies quota subscribers', () => {
    const listener = vi.fn();
    subscribeMediaLibraryQuotaUpdated(listener);

    publishMediaLibraryQuotaUpdated({
      usedBytes: 10,
      limitBytes: 100,
      sampleCount: 1,
      maxBufferSamples: 10,
      recordingBlocked: false,
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ sampleCount: 1, recordingBlocked: false }),
    );
  });
});
