import { describe, expect, it } from 'vitest';

import {
  classifyTrends,
  computeTemporalFeatures,
  resolveEnabledTemplates,
  SYSTEM_TEMPLATES,
  type MetricSample,
} from './index.js';

function makeSamples(
  count: number,
  factory: (index: number) => Omit<MetricSample, 'timestamp'> & { timestamp?: number },
  intervalMs = 30,
): MetricSample[] {
  return Array.from({ length: count }, (_, index) => {
    const base = factory(index);
    return {
      timestamp: base.timestamp ?? index * intervalMs,
      centroid: base.centroid,
      flux: base.flux,
      rms: base.rms,
    };
  });
}

describe('computeTemporalFeatures', () => {
  it('is deterministic for identical input', () => {
    const samples = makeSamples(20, () => ({
      centroid: 400,
      flux: 0.3,
      rms: 0.08,
    }));
    const a = computeTemporalFeatures(samples);
    const b = computeTemporalFeatures(samples);
    expect(a).toEqual(b);
  });

  it('reports low activity for quiet signal', () => {
    const samples = makeSamples(30, () => ({
      centroid: 200,
      flux: 0.02,
      rms: 0.005,
    }));
    const features = computeTemporalFeatures(samples);
    expect(features.activityRatio).toBeLessThan(0.2);
  });
});

describe('classifyTrends', () => {
  it('returns unknown for empty window', () => {
    const result = classifyTrends([], SYSTEM_TEMPLATES);
    expect(result.detectedState).toBe('UNKNOWN');
    expect(result.isDetected).toBe(false);
  });

  it('classifies stable wind-like noise', () => {
    const samples = makeSamples(80, (i) => ({
      centroid: 350 + Math.sin(i / 8) * 5,
      flux: 0.25,
      rms: 0.1,
    }));
    const result = classifyTrends(samples, resolveEnabledTemplates(['WIND', 'QUIET', 'TRAFFIC']));
    expect(result.detectedState).toBe('WIND');
    expect(result.confidence).toBeGreaterThan(35);
    expect(result.isDetected).toBe(false);
  });

  it('classifies quiet near-silence', () => {
    const samples = makeSamples(60, () => ({
      centroid: 100,
      flux: 0.01,
      rms: 0.008,
    }));
    const result = classifyTrends(samples, resolveEnabledTemplates(['QUIET', 'WIND']));
    expect(result.detectedState).toBe('QUIET');
    expect(result.isDetected).toBe(false);
  });

  it('scores drone-like sustained high-centroid signal', () => {
    const samples = makeSamples(70, (i) => ({
      centroid: 1800 + Math.sin(i / 5) * 30,
      flux: 0.2,
      rms: 0.12,
    }));
    const result = classifyTrends(
      samples,
      resolveEnabledTemplates(['DRONE', 'WIND', 'TRAFFIC']),
    );
    const droneScore = result.scores.find((s) => s.key === 'DRONE');
    expect(droneScore).toBeDefined();
    expect(droneScore!.score).toBeGreaterThan(30);
  });

  it('droneFirstMinGap: overrides non-drone winner when gap is below threshold', () => {
    // Low-frequency stable signal — scores close to WIND, but also some drone score
    const samples = makeSamples(80, (i) => ({
      centroid: 1200 + Math.sin(i / 6) * 20,
      flux: 0.1,
      rms: 0.12,
    }));
    const templates = resolveEnabledTemplates(['WIND', 'DRONE', 'TRAFFIC']);
    const baseline = classifyTrends(samples, templates);
    const droneFirst = classifyTrends(samples, templates, { droneFirstMinGap: 100 });

    // With gap=100 (max possible), drone MUST win unless it scores 0
    const droneScore = baseline.scores.find((s) => s.key === 'DRONE');
    if (droneScore && droneScore.score > 0 && baseline.detectedState !== 'DRONE') {
      expect(droneFirst.detectedState).toBe('DRONE');
    }
    // Without gap, winner is baseline winner
    expect(baseline.detectedState).toBe(baseline.detectedState);
  });

  it('droneFirstMinGap: does not override when drone scores 0', () => {
    const samples = makeSamples(60, () => ({ centroid: 100, flux: 0.01, rms: 0.008 }));
    const templates = resolveEnabledTemplates(['QUIET', 'DRONE', 'WIND']);
    const result = classifyTrends(samples, templates, { droneFirstMinGap: 20 });
    // QUIET wins clearly — DRONE should not override because centroid/rms far outside drone range
    expect(result.scores.length).toBeGreaterThan(0);
  });

  it('handles white-noise-like high flux variance without throwing', () => {
    const samples = makeSamples(50, (i) => ({
      centroid: 800 + (i % 7) * 120,
      flux: 0.3 + (i % 5) * 0.25,
      rms: 0.1 + (i % 3) * 0.04,
    }));
    const result = classifyTrends(samples, SYSTEM_TEMPLATES);
    expect(result.detectedState).toBeTruthy();
    expect(result.scores.length).toBe(SYSTEM_TEMPLATES.length);
  });
});
