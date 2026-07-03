import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearActivePlaybackForTests,
  getActivePlaybackCountForTests,
  registerActivePlayback,
  stopAllActivePlayback,
  unregisterActivePlayback,
  type StoppablePlayback,
} from './playback-registry.js';

function fakePlayer(): StoppablePlayback & { stop: ReturnType<typeof vi.fn> } {
  return { stop: vi.fn().mockResolvedValue(undefined) };
}

describe('playback registry (CT6)', () => {
  afterEach(() => {
    clearActivePlaybackForTests();
  });

  it('stopAllActivePlayback останавливает все зарегистрированные плееры с fade-опциями', async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    registerActivePlayback(a);
    registerActivePlayback(b);

    const stopped = await stopAllActivePlayback({ fadeOutMs: 200 });

    expect(stopped).toBe(2);
    expect(a.stop).toHaveBeenCalledWith({ fadeOutMs: 200 });
    expect(b.stop).toHaveBeenCalledWith({ fadeOutMs: 200 });
  });

  it('unregister убирает плеер; отказ одного stop не роняет остальные', async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    b.stop.mockRejectedValue(new Error('boom'));
    registerActivePlayback(a);
    registerActivePlayback(b);
    unregisterActivePlayback(a);
    expect(getActivePlaybackCountForTests()).toBe(1);

    const stopped = await stopAllActivePlayback();

    expect(stopped).toBe(1);
    expect(a.stop).not.toHaveBeenCalled();
    expect(b.stop).toHaveBeenCalledWith(undefined);
  });
});
