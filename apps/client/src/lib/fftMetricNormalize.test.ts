import { describe, expect, it } from 'vitest';

import {
  DEMO_DRONE_THRESHOLDS,
  clamp01,
  isInDroneZone,
  normalizeCentroidHz,
  normalizeFlux,
  normalizeLoudness,
} from './fftMetricNormalize';

describe('fftMetricNormalize', () => {
  it('clamp01 handles non-finite', () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.2)).toBe(0);
  });

  it('normalizes centroid by 5000 Hz', () => {
    expect(normalizeCentroidHz(2500)).toBeCloseTo(0.5);
    expect(normalizeCentroidHz(10_000)).toBe(1);
  });

  it('normalizes flux and loudness', () => {
    expect(normalizeFlux(0.5)).toBe(0.5);
    expect(normalizeLoudness(0.35)).toBe(1);
  });

  it('isInDroneZone uses demo thresholds', () => {
    expect(isInDroneZone(800, 'centroid')).toBe(true);
    expect(isInDroneZone(100, 'centroid')).toBe(false);
    expect(isInDroneZone(DEMO_DRONE_THRESHOLDS.flux.min, 'flux')).toBe(true);
  });
});
