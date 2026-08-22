import { afterEach, describe, expect, it } from 'vitest';

import { startClipRecorder } from './clipRecorder';

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

describe('startClipRecorder WAV sample-rate preflight', () => {
  it('refuses the first WAV capture before accepting PCM when actual rate is not 48 kHz', () => {
    let closeCalled = false;
    let sourceCreated = false;

    class FakeAudioContext {
      readonly sampleRate = 44_100;

      createMediaStreamSource(): unknown {
        sourceCreated = true;
        return { connect: () => undefined, disconnect: () => undefined };
      }

      close(): Promise<void> {
        closeCalled = true;
        return Promise.resolve();
      }
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { AudioContext: FakeAudioContext },
    });

    const stream = { active: true, getTracks: () => [] } as unknown as MediaStream;

    expect(() => startClipRecorder(stream, 'wav')).toThrow(
      'AudioContext sampleRate 44100 does not match requested 48000',
    );
    expect(closeCalled).toBe(true);
    expect(sourceCreated).toBe(false);
  });
});
