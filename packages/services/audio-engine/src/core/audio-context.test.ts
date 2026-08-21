import { afterEach, describe, expect, it } from 'vitest';

import { createAudioContext } from './audio-context.js';
import { LiveSampler } from './live-sampler.js';

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

describe('createAudioContext', () => {
  it('passes requested sampleRate to AudioContext', () => {
    let receivedOptions: AudioContextOptions | undefined;

    class FakeAudioContext {
      readonly sampleRate = 48_000;

      constructor(options?: AudioContextOptions) {
        receivedOptions = options;
      }

      close(): Promise<void> {
        return Promise.resolve();
      }
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { AudioContext: FakeAudioContext },
    });

    const context = createAudioContext({ sampleRate: 48_000 });

    expect(context.sampleRate).toBe(48_000);
    expect(receivedOptions).toEqual({ sampleRate: 48_000 });
  });

  it('keeps default construction when no sampleRate is requested', () => {
    let receivedOptions: AudioContextOptions | undefined;

    class FakeAudioContext {
      readonly sampleRate = 44_100;

      constructor(options?: AudioContextOptions) {
        receivedOptions = options;
      }

      close(): Promise<void> {
        return Promise.resolve();
      }
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { AudioContext: FakeAudioContext },
    });

    const context = createAudioContext();

    expect(context.sampleRate).toBe(44_100);
    expect(receivedOptions).toBeUndefined();
  });
});

describe('LiveSampler sampleRate guard', () => {
  it('refuses to start when actual AudioContext sampleRate differs from requested rate', async () => {
    let closeCalled = false;

    class FakeAudioContext {
      readonly sampleRate = 44_100;

      close(): Promise<void> {
        closeCalled = true;
        return Promise.resolve();
      }
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { AudioContext: FakeAudioContext },
    });

    const sampler = new LiveSampler({ sampleRate: 48_000 });
    const stream = { active: true, getTracks: () => [] } as unknown as MediaStream;

    await expect(sampler.start(stream)).rejects.toThrow(
      'AudioContext sampleRate 44100 does not match requested 48000',
    );
    expect(closeCalled).toBe(true);
    expect(sampler.isRunning()).toBe(false);
  });
});
