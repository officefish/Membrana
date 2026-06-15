import { describe, expect, it } from 'vitest';
import { harmonicDroneWindow, sineWindow, whiteNoiseWindow } from '@membrana/detector-base';
import { CepstralDetector } from './core/cepstral-detector.js';
import { DEFAULT_FFT_SIZE } from './constants.js';

describe('cepstral detector contract', () => {
  const detector = new CepstralDetector();

  it('exposes name and family', () => {
    expect(detector.name).toBe('cepstral');
    expect(detector.family).toBe('dsp');
  });

  it('detect returns DetectionResult on sine', async () => {
    const result = await detector.detect(padWindow(sineWindow(440)));
    expect(result).toMatchObject({
      isDrone: expect.any(Boolean),
      confidence: expect.any(Number),
      latencyMs: expect.any(Number),
    });
  });

  it('detect classifies harmonic mock as drone', async () => {
    const result = await detector.detect(padWindow(harmonicDroneWindow()));
    expect(result.isDrone).toBe(true);
  });

  it('detect rejects white noise', async () => {
    const result = await detector.detect(padWindow(whiteNoiseWindow()));
    expect(result.isDrone).toBe(false);
  });
});

function padWindow<T extends { samples: Float32Array }>(window: T): T {
  if (window.samples.length >= DEFAULT_FFT_SIZE) {
    return window;
  }
  const samples = new Float32Array(DEFAULT_FFT_SIZE);
  samples.set(window.samples);
  return { ...window, samples };
}
