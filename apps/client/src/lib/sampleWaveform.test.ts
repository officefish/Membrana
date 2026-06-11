import { describe, expect, it } from 'vitest';

import {
  computePeakEnvelope,
  formatPlaybackTime,
  ratioToOffsetSec,
} from './sampleWaveform';

describe('sampleWaveform', () => {
  it('computePeakEnvelope returns normalized peaks', () => {
    const samples = new Float32Array(100);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((i / 100) * Math.PI * 2);
    }
    const peaks = computePeakEnvelope(samples, 8);
    expect(peaks).toHaveLength(8);
    expect(Math.max(...peaks)).toBeCloseTo(1, 5);
  });

  it('ratioToOffsetSec maps ratio to seconds', () => {
    expect(ratioToOffsetSec(0.5, 10)).toBe(5);
    expect(ratioToOffsetSec(1.5, 10)).toBe(10);
    expect(ratioToOffsetSec(-1, 10)).toBe(0);
  });

  it('formatPlaybackTime renders mm:ss', () => {
    expect(formatPlaybackTime(65)).toBe('1:05');
    expect(formatPlaybackTime(0)).toBe('0:00');
  });
});
