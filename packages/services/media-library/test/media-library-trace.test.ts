import { describe, expect, it, vi } from 'vitest';

import { MemoryStorageBackend } from '../src/backends/memory-storage-backend.js';
import { BUFFER_COLLECTION_ID } from '../src/constants.js';
import { createMediaLibraryService } from '../src/media-library-service.js';
import { mediaLibraryTrace, setMediaLibraryTraceHook } from '../src/media-library-trace.js';

describe('media-library trace hook', () => {
  it('forwards refresh and importBlob events when hook is set', async () => {
    const hook = vi.fn();
    setMediaLibraryTraceHook(hook);
    const svc = createMediaLibraryService(new MemoryStorageBackend({ limitBytes: 5_000_000 }));
    await svc.init();

    hook.mockClear();
    const blob = new Blob([new Uint8Array(64)], { type: 'audio/wav' });
    await svc.importBlob(BUFFER_COLLECTION_ID, blob, {
      title: 'trace-test',
      class: 'buffer',
      label: 'unlabeled',
      source: 'mic-recording',
      durationSec: 0.1,
      sampleRate: 48_000,
      channels: 1,
    });

    const events = hook.mock.calls.map(([event]) => event);
    expect(events).toContain('importBlob-start');
    expect(events).toContain('putSample-done');
    expect(events).toContain('refresh-start');
    expect(events).toContain('refresh-done');
    expect(events).toContain('importBlob-done');

    setMediaLibraryTraceHook(null);
  });

  it('is no-op without hook', () => {
    setMediaLibraryTraceHook(null);
    expect(() => mediaLibraryTrace('noop', { ok: true })).not.toThrow();
  });
});
