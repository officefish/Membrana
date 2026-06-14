import { describe, expect, it } from 'vitest';

import { extractBufferFrames } from './extractBufferFrames';

function makeSineBuffer(
  sampleRate: number,
  durationSec: number,
  frequencyHz: number,
): AudioBuffer {
  const length = Math.floor(sampleRate * durationSec);
  const buffer = {
    sampleRate,
    length,
    duration: durationSec,
    numberOfChannels: 1,
    getChannelData: (channel: number) => {
      if (channel !== 0) throw new Error('mono only');
      const data = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        data[i] = Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate);
      }
      return data;
    },
    copyFromChannel: () => undefined,
    copyToChannel: () => undefined,
  };
  return buffer as unknown as AudioBuffer;
}

describe('extractBufferFrames', () => {
  it('emits deterministic frame count for sine buffer', () => {
    const buffer = makeSineBuffer(48_000, 0.2, 440);
    const bufferSize = 2048;
    const frames: number[] = [];

    const count = extractBufferFrames(
      {
        buffer,
        bufferSize,
        hopSize: bufferSize,
        originTimestampMs: 1_000,
        timestampStepMs: 500,
      },
      (frame) => {
        frames.push(frame.timestamp);
        expect(frame.samples.length).toBe(bufferSize);
        expect(frame.sampleRate).toBe(48_000);
      },
    );

    expect(count).toBe(Math.floor((48_000 * 0.2) / bufferSize));
    expect(frames[0]).toBe(1_000);
    expect(frames[1]).toBe(1_500);
  });

  it('returns zero when buffer shorter than window', () => {
    const buffer = makeSineBuffer(48_000, 0.01, 100);
    const count = extractBufferFrames(
      { buffer, bufferSize: 2048 },
      () => undefined,
    );
    expect(count).toBe(0);
  });
});
