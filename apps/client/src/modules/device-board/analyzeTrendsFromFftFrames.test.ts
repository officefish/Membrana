import { describe, expect, it } from 'vitest';
import { resolveScenarioFftTrendsPolicy } from '@membrana/core';

import {
  analyzeTrendsFromFftFrames,
  subsampleFftFramesForTrendsPolicy,
} from './analyzeTrendsFromFftFrames';

const testPolicy = resolveScenarioFftTrendsPolicy({
  measurementsCount: 5,
  intervalMs: 100,
  minConfidence: 0.55,
  minRms: 0.02,
  enabledTemplateKeys: ['DRONE_TIGHT'],
});

function frameAt(ms: number) {
  return {
    computedAtIso: new Date(ms).toISOString(),
    spectralCentroidHz: 200,
    flux: 0.001,
    rms: 0.001,
  };
}

describe('subsampleFftFramesForTrendsPolicy', () => {
  it('picks measurementsCount frames spaced by intervalMs ending at latest', () => {
    const base = Date.now();
    const frames = Array.from({ length: 20 }, (_, i) => frameAt(base + i * 50));
    const picked = subsampleFftFramesForTrendsPolicy(frames, testPolicy);
    expect(picked).toHaveLength(5);
  });

  it('returns fewer than measurementsCount when batch too short', () => {
    const base = Date.now();
    const frames = [frameAt(base), frameAt(base + 50)];
    const picked = subsampleFftFramesForTrendsPolicy(frames, testPolicy);
    expect(picked.length).toBeLessThan(testPolicy.measurementsCount);
  });
});

describe('analyzeTrendsFromFftFrames', () => {
  it('returns null for empty frames', () => {
    expect(analyzeTrendsFromFftFrames([], { policy: testPolicy })).toBeNull();
  });

  it('returns null when subsample cannot fill measurementsCount', () => {
    const base = Date.now();
    const frames = [frameAt(base), frameAt(base + 50)];
    expect(analyzeTrendsFromFftFrames(frames, { policy: testPolicy })).toBeNull();
  });

  it('classifies when enough spaced frames exist', () => {
    const base = Date.now();
    const frames = Array.from({ length: 12 }, (_, i) => frameAt(base + i * 100));
    const result = analyzeTrendsFromFftFrames(frames, {
      policy: testPolicy,
      resolveTemplates: () => [],
    });
    expect(result).not.toBeNull();
    expect(result!.metricSampleCount).toBe(5);
    expect(result!.policy.measurementsCount).toBe(5);
  });
});
