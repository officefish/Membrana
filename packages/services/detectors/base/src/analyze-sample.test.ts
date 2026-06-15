import { describe, expect, it } from 'vitest';

import { analyzeSample } from './analyze-sample.js';
import { createMockDroneDetector } from './mock-detector.js';
import { harmonicDroneWindow } from './test-fixtures.js';

describe('analyzeSample', () => {
  it('returns zero verdict when buffer shorter than fftSize', async () => {
    const detector = createMockDroneDetector({ isDrone: true, confidence: 0.9 });
    const { verdict, frameLatenciesMs } = await analyzeSample(
      new Float32Array(100),
      48_000,
      detector,
      { fftSize: 2048 },
    );
    expect(verdict.frameCount).toBe(0);
    expect(verdict.isDrone).toBe(false);
    expect(verdict.confidence).toBe(0);
    expect(frameLatenciesMs).toHaveLength(0);
  });

  it('aggregates max confidence and any-frame isDrone across windows', async () => {
    let call = 0;
    const detector: import('./types.js').DroneDetector = {
      name: 'mock-seq',
      family: 'dsp',
      detect: async () => {
        call += 1;
        if (call === 2) {
          return { isDrone: true, confidence: 0.82, latencyMs: 1 };
        }
        return { isDrone: false, confidence: 0.2, latencyMs: 0.5 };
      },
    };

    const samples = harmonicDroneWindow().samples;
    const { verdict } = await analyzeSample(samples, 48_000, detector, {
      fftSize: 2048,
      hopSize: 1024,
    });

    expect(verdict.frameCount).toBeGreaterThan(1);
    expect(verdict.isDrone).toBe(true);
    expect(verdict.confidence).toBe(0.82);
    expect(verdict.maxFrameConfidence).toBe(0.82);
    expect(verdict.latencyMsTotal).toBeGreaterThan(0);
  });
});
