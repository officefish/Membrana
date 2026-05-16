import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FFT_SIZE,
  DEFAULT_SAMPLE_RATE,
} from '../constants.js';
import { classifySpectrum } from './classifier.js';
import { hzToBin } from './frequencies.js';

function syntheticMagnitudes(
  peaks: ReadonlyArray<{ readonly hz: number; readonly amp: number }>,
  fftSize = DEFAULT_FFT_SIZE,
  sampleRate = DEFAULT_SAMPLE_RATE,
): Float32Array {
  const magnitudes = new Float32Array(fftSize / 2);
  for (const { hz, amp } of peaks) {
    const bin = hzToBin(hz, sampleRate, fftSize);
    if (bin >= 0 && bin < magnitudes.length) {
      magnitudes[bin] = amp;
    }
  }
  return magnitudes;
}

describe('classifySpectrum', () => {
  it('detects harmonic stack at 120 Hz', () => {
    const magnitudes = syntheticMagnitudes([
      { hz: 120, amp: 1 },
      { hz: 240, amp: 0.85 },
      { hz: 360, amp: 0.7 },
      { hz: 480, amp: 0.5 },
    ]);
    const result = classifySpectrum(magnitudes, DEFAULT_SAMPLE_RATE, DEFAULT_FFT_SIZE);
    expect(result.isDrone).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.55);
    expect(result.fundamentals?.[0]).toBeGreaterThan(100);
    expect(result.fundamentals?.[0]).toBeLessThan(140);
  });

  it('rejects flat spectrum without spectral peaks', () => {
    const magnitudes = new Float32Array(DEFAULT_FFT_SIZE / 2);
    for (let i = 0; i < magnitudes.length; i++) {
      magnitudes[i] = 0.3;
    }
    const result = classifySpectrum(magnitudes, DEFAULT_SAMPLE_RATE, DEFAULT_FFT_SIZE);
    expect(result.isDrone).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('returns zero confidence for silence', () => {
    const magnitudes = new Float32Array(DEFAULT_FFT_SIZE / 2);
    const result = classifySpectrum(magnitudes, DEFAULT_SAMPLE_RATE, DEFAULT_FFT_SIZE);
    expect(result.isDrone).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('rejects single tone outside rotor band as fundamental', () => {
    const magnitudes = syntheticMagnitudes([{ hz: 440, amp: 1 }]);
    const result = classifySpectrum(magnitudes, DEFAULT_SAMPLE_RATE, DEFAULT_FFT_SIZE);
    expect(result.isDrone).toBe(false);
  });
});
