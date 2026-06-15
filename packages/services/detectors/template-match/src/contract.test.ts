import { describe, expect, it } from 'vitest';

import { collectMetricSamples } from './collect-metric-samples.js';
import {
  createDefaultTemplateMatchCatalog,
  createTemplateMatchDetector,
} from './index.js';

describe('template-match detector contract', () => {
  const detector = createTemplateMatchDetector({
    templates: createDefaultTemplateMatchCatalog(),
  });

  it('exposes name and family', () => {
    expect(detector.name).toBe('template-match');
    expect(detector.family).toBe('dsp');
  });

  it('detect returns DetectionResult on synthetic buffer', async () => {
    const sampleRate = 48_000;
    const samples = new Float32Array(sampleRate * 5);
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = Math.sin((i / sampleRate) * Math.PI * 2 * 1200) * 0.15;
    }

    const result = await detector.detect({
      samples,
      sampleRate,
      timestamp: 0,
      durationSec: 5,
    });

    expect(result).toMatchObject({
      isDrone: expect.any(Boolean),
      confidence: expect.any(Number),
      latencyMs: expect.any(Number),
    });
  });

  it('collectMetricSamples returns measurements for 5s buffer', () => {
    const sampleRate = 48_000;
    const samples = new Float32Array(sampleRate * 5);
    const metrics = collectMetricSamples(samples, sampleRate);
    expect(metrics.length).toBeGreaterThanOrEqual(5);
    expect(metrics[0]).toMatchObject({
      centroid: expect.any(Number),
      flux: expect.any(Number),
      rms: expect.any(Number),
    });
  });
});
