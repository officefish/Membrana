import { describe, expect, it } from 'vitest';
import { harmonicDroneWindow, sineWindow, whiteNoiseWindow } from '@membrana/detector-base';
import { SpectralFluxDetector } from './core/spectral-flux-detector.js';
import { DEFAULT_FFT_SIZE } from './constants.js';

describe('spectral-flux detector contract', () => {
  const detector = new SpectralFluxDetector();

  it('exposes name and family', () => {
    expect(detector.name).toBe('spectral-flux');
    expect(detector.family).toBe('dsp');
  });

  it('detect returns DetectionResult on sine', async () => {
    const result = await detector.detect(padWindow(sineWindow(440), 50));
    expect(result).toMatchObject({
      isDrone: expect.any(Boolean),
      confidence: expect.any(Number),
      latencyMs: expect.any(Number),
    });
  });

  it('detect classifies harmonic mock as drone on second frame', async () => {
    const window = padWindow(harmonicDroneWindow());
    await detector.detect({ ...window, timestamp: 0 });
    const result = await detector.detect({ ...window, timestamp: 50 });
    expect(result.isDrone).toBe(true);
  });

  it('detect rejects white noise', async () => {
    const window = padWindow(whiteNoiseWindow());
    await detector.detect({ ...window, timestamp: 0 });
    const result = await detector.detect({ ...window, timestamp: 50 });
    expect(result.isDrone).toBe(false);
  });
});

function padWindow<T extends { samples: Float32Array; timestamp?: number }>(
  window: T,
  timestamp = 0,
): T & { timestamp: number } {
  const samples =
    window.samples.length >= DEFAULT_FFT_SIZE
      ? window.samples
      : (() => {
          const out = new Float32Array(DEFAULT_FFT_SIZE);
          out.set(window.samples);
          return out;
        })();
  return { ...window, samples, timestamp };
}
