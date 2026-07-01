import { describe, expect, it } from 'vitest';
import type { TrendsDetectionResult } from '@membrana/trends-detector-service';

import {
  buildTemplateFromAnalysis,
  canBuildTemplateFromAnalysis,
} from './buildTemplateFromAnalysis';

function makeResult(overrides: Partial<TrendsDetectionResult> = {}): TrendsDetectionResult {
  return {
    class: 'wind',
    isDrone: false,
    isClassified: true,
    detectedState: 'WIND',
    detectedStateName: 'Ветер',
    detectedStateIcon: '💨',
    detectedStateColor: '#a0c4ff',
    confidence: 72,
    confidenceLevel: 'medium',
    isDetected: true,
    scores: [],
    samples: Array.from({ length: 10 }, () => ({
      timestamp: Date.now(),
      centroid: 320,
      flux: 0.22,
      rms: 0.09,
    })),
    temporalFeatures: {
      centroidStd: 25,
      fluxStd: 0.04,
      rmsStd: 0.01,
      activityRatio: 0.95,
      avgSilenceDuration: 0.02,
      avgBurstDuration: 8,
      frequencyJumps: {
        enabled: false,
        actualJumps: 0,
        densityPerSecond: 0,
        minJumpsRequired: 0,
        magnitudeRange: { min: 0, max: 0, avg: 0 },
      },
      volumeTrend: 'stable',
      frequencyTrend: 'stable',
      longTermStability: 'high',
      periodicity: 'none',
      envelopeShape: 'sustained',
      peakToAverageRatio: 1.2,
    },
    ...overrides,
  };
}

describe('buildTemplateFromAnalysis', () => {
  it('returns false when analysis data is incomplete', () => {
    expect(canBuildTemplateFromAnalysis(null)).toBe(false);
    expect(canBuildTemplateFromAnalysis(makeResult({ samples: [] }))).toBe(false);
    expect(canBuildTemplateFromAnalysis(makeResult({ temporalFeatures: null }))).toBe(false);
  });

  it('builds user template with spectral and temporal bounds', () => {
    const template = buildTemplateFromAnalysis(makeResult(), []);
    expect(template.key.startsWith('user:')).toBe(true);
    expect(template.thresholds.centroid.min).toBeLessThan(320);
    expect(template.thresholds.centroid.max).toBeGreaterThan(320);
    expect(template.temporalPatterns.volumeTrend).toEqual(['stable']);
    expect(template.temporalPatterns.centroidStd?.min).toBeLessThan(25);
    expect(template.description).toContain('10 замеров');
  });

  it('uses detected scene metadata when available', () => {
    const template = buildTemplateFromAnalysis(makeResult(), []);
    expect(template.name).toContain('Ветер');
    expect(template.icon).toBe('💨');
  });
});
