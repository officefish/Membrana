import { describe, expect, it } from 'vitest';
import { DEFAULT_HARMONIC_DETECTOR_CONFIG } from './classifier.js';
import { mergeFundamentals, scoreHarmonicStack } from './harmonics.js';
import { hzToBin } from './frequencies.js';
import { DEFAULT_FFT_SIZE, DEFAULT_SAMPLE_RATE } from '../constants.js';

describe('scoreHarmonicStack', () => {
  it('scores high when harmonics align', () => {
    const magnitudes = new Float32Array(DEFAULT_FFT_SIZE / 2);
    for (const hz of [120, 240, 360, 480]) {
      magnitudes[hzToBin(hz, DEFAULT_SAMPLE_RATE, DEFAULT_FFT_SIZE)] = 1;
    }
    const { score, harmonicCount } = scoreHarmonicStack(
      magnitudes,
      DEFAULT_SAMPLE_RATE,
      DEFAULT_FFT_SIZE,
      120,
      DEFAULT_HARMONIC_DETECTOR_CONFIG,
    );
    expect(harmonicCount).toBeGreaterThanOrEqual(3);
    expect(score).toBeGreaterThan(0.5);
  });
});

describe('mergeFundamentals', () => {
  it('merges close frequencies', () => {
    expect(mergeFundamentals([120, 125, 200])).toEqual([122.5, 200]);
  });
});
