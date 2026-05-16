import { describe, expect, it } from 'vitest';
import { harmonicDroneWindow, sineWindow } from '@membrana/detector-base';
import { HarmonicDetector } from './core/harmonic-detector.js';
import { DEFAULT_FFT_SIZE, DEFAULT_SAMPLE_RATE } from './constants.js';

describe('HarmonicDetector integration', () => {
  const detector = new HarmonicDetector();

  it('detects harmonic drone fixture', async () => {
    const window = harmonicDroneWindow();
  const padded = {
    ...window,
    samples: padToFftSize(window.samples, DEFAULT_FFT_SIZE),
    durationSec: DEFAULT_FFT_SIZE / DEFAULT_SAMPLE_RATE,
  };
    const result = await detector.detect(padded);
    expect(result.isDrone).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.55);
    expect(result.latencyMs).toBeLessThan(100);
    expect(result.reasoning).toMatch(/гармоническ/i);
  });

  it('rejects 440 Hz sine', async () => {
    const window = sineWindow(440, DEFAULT_FFT_SIZE / DEFAULT_SAMPLE_RATE);
    const padded = {
      ...window,
      samples: padToFftSize(window.samples, DEFAULT_FFT_SIZE),
    };
    const result = await detector.detect(padded);
    expect(result.isDrone).toBe(false);
  });

  it('rejects non-harmonic broadband signal', async () => {
    const samples = new Float32Array(DEFAULT_FFT_SIZE);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((i / DEFAULT_FFT_SIZE) * Math.PI * 40) * 0.2;
    }
    const result = await detector.detect({
      samples,
      sampleRate: DEFAULT_SAMPLE_RATE,
      timestamp: 0,
      durationSec: DEFAULT_FFT_SIZE / DEFAULT_SAMPLE_RATE,
    });
    expect(result.isDrone).toBe(false);
  });
});

function padToFftSize(samples: Float32Array, fftSize: number): Float32Array {
  if (samples.length >= fftSize) {
    return samples.subarray(0, fftSize);
  }
  const out = new Float32Array(fftSize);
  out.set(samples);
  return out;
}
