import { describe, expect, it } from 'vitest';

import { trendsFftSamplePluginState } from './trendsFftSamplePluginState';

describe('trendsFftSamplePluginState', () => {
  it('offline analysis lifecycle updates snapshot', () => {
    trendsFftSamplePluginState.beginOfflineAnalysis('sample-1', 10);
    expect(trendsFftSamplePluginState.getSnapshot().analysisStatus).toBe('loading');
    expect(trendsFftSamplePluginState.getSnapshot().phase).toBe('collecting');

    trendsFftSamplePluginState.failOfflineAnalysis('decode failed');
    expect(trendsFftSamplePluginState.getSnapshot().analysisStatus).toBe('error');
    expect(trendsFftSamplePluginState.getSnapshot().errorMessage).toBe('decode failed');
  });

  it('restarts when analysis window params change after result', () => {
    trendsFftSamplePluginState.beginCollection(10);
    trendsFftSamplePluginState.finishCollection(
      {
        detectedState: 'drone',
        detectedStateName: 'Drone',
        detectedStateIcon: '🚁',
        detectedStateColor: '#fff',
        confidence: 80,
        confidenceLevel: 'high',
        isDetected: true,
        scores: [],
        samples: [],
        temporalFeatures: {
          volumeTrend: 'stable',
          frequencyTrend: 'stable',
          longTermStability: 'stable',
          periodicity: 'none',
          envelopeShape: 'steady',
          centroidStd: 1,
          fluxStd: 0.1,
          rmsStd: 0.01,
          activityRatio: 0.5,
          avgSilenceDuration: 0,
          avgBurstDuration: 1,
          frequencyJumps: {
            enabled: false,
            actualJumps: 0,
            densityPerSecond: 0,
          },
        },
      },
      { measurementsCount: 100, intervalMs: 100 },
    );

    expect(
      trendsFftSamplePluginState.shouldRestartForParams(50, 100),
    ).toBe(true);
    expect(
      trendsFftSamplePluginState.shouldRestartForParams(100, 200),
    ).toBe(true);
    expect(
      trendsFftSamplePluginState.shouldRestartForParams(100, 100),
    ).toBe(false);

    trendsFftSamplePluginState.invalidateResult(50);
    expect(trendsFftSamplePluginState.getSnapshot().phase).toBe('idle');
    expect(trendsFftSamplePluginState.getSnapshot().lastResult).toBeNull();
  });
});
