import { describe, expect, it, vi } from 'vitest';

import {
  getMicrophoneCaptureSnapshot,
  registerMicrophoneCaptureOwner,
  requestMicrophoneStart,
  requestMicrophoneStop,
  subscribeMicrophoneCapture,
} from './microphoneCaptureCoordinator';

describe('microphoneCaptureCoordinator', () => {
  it('returns idle snapshot without owner', () => {
    expect(getMicrophoneCaptureSnapshot()).toEqual({ isLive: false, error: null });
  });

  it('delegates start/stop to owner', async () => {
    const start = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn();
    const unregister = registerMicrophoneCaptureOwner({
      start,
      stop,
      getSnapshot: () => ({ isLive: true, error: null }),
    });

    await requestMicrophoneStart();
    expect(start).toHaveBeenCalledOnce();

    requestMicrophoneStop();
    expect(stop).toHaveBeenCalledOnce();

    unregister();
  });

  it('notifies subscribers when capture state changes on register', () => {
    const listener = vi.fn();
    const unsub = subscribeMicrophoneCapture(listener);
    registerMicrophoneCaptureOwner({
      start: async () => undefined,
      stop: () => undefined,
      getSnapshot: () => ({ isLive: true, error: null }),
    });
    expect(listener).toHaveBeenCalled();
    expect(getMicrophoneCaptureSnapshot().isLive).toBe(true);
    unsub();
  });
});
