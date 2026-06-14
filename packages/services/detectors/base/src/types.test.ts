import { describe, expect, it } from 'vitest';

import { audioWindowFromFrame, harmonicDroneWindow, sineWindow, whiteNoiseWindow } from './index.js';

describe('detector-base types', () => {
  it('audioWindowFromFrame computes duration', () => {
    const frame = {
      samples: new Float32Array(2048),
      sampleRate: 48_000,
      timestamp: 10_000,
    };
    const w = audioWindowFromFrame(frame, 10_000);
    expect(w.timestamp).toBe(0);
    expect(w.durationSec).toBeCloseTo(2048 / 48_000, 5);
  });

  it('sineWindow has expected length', () => {
    const w = sineWindow(440, 0.01, 48_000);
    expect(w.samples.length).toBe(480);
  });

  it('harmonicDroneWindow is non-empty', () => {
    const w = harmonicDroneWindow();
    expect(w.samples.some((s) => Math.abs(s) > 0.01)).toBe(true);
  });

  it('whiteNoiseWindow is deterministic for the same seed', () => {
    const a = whiteNoiseWindow(48_000, 42);
    const b = whiteNoiseWindow(48_000, 42);
    expect([...a.samples]).toEqual([...b.samples]);
  });
});
