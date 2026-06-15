import { describe, expect, it } from 'vitest';

import {
  computeFrameHitRatio,
  isSampleInSpectralBounds,
  scoreSpectral,
} from './scoring.js';
import type { PatternTemplate } from '../types.js';

const baseTemplate: PatternTemplate = {
  key: 'TEST',
  name: 'Test',
  icon: 'T',
  color: '#ccc',
  description: 'test',
  thresholds: {
    centroid: { min: 100, max: 500 },
    flux: { min: 0.1, max: 0.5 },
    rms: { min: 0.05, max: 0.2 },
    frameHitRatio: { min: 0.5, max: 0.8 },
  },
  temporalPatterns: {},
};

describe('frameHitRatio', () => {
  it('counts only samples with all three metrics in bounds', () => {
    const samples = [
      { centroid: 200, flux: 0.2, rms: 0.1 },
      { centroid: 600, flux: 0.2, rms: 0.1 },
      { centroid: 200, flux: 0.9, rms: 0.1 },
      { centroid: 200, flux: 0.2, rms: 0.1 },
    ];
    expect(isSampleInSpectralBounds(samples[0]!, baseTemplate.thresholds)).toBe(true);
    expect(computeFrameHitRatio(samples, baseTemplate.thresholds)).toBe(0.5);
  });

  it('includes hit ratio in spectral score', () => {
    const inBounds = Array.from({ length: 8 }, () => ({
      centroid: 200,
      flux: 0.2,
      rms: 0.1,
    }));
    const outBounds = Array.from({ length: 2 }, () => ({
      centroid: 900,
      flux: 0.2,
      rms: 0.1,
    }));
    const samples = [...inBounds, ...outBounds];
    const score = scoreSpectral(baseTemplate, 200, 0.2, 0.1, samples);
    expect(score).toBeGreaterThan(0.7);
  });
});
