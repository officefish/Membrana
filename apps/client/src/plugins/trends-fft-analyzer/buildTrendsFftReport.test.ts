import { describe, expect, it } from 'vitest';

import { buildTrendsFftReport } from './buildTrendsFftReport';

describe('buildTrendsFftReport', () => {
  it('includes reportKind fields for telemetry journal', () => {
    const report = buildTrendsFftReport({
      reportId: 'test-1',
      startedAt: 1000,
      finishedAt: 5000,
      intervalMs: 30,
      measurementsCount: 10,
      mode: 'auto',
      result: {
        detectedState: 'WIND',
        detectedStateName: 'Ветер',
        detectedStateIcon: '💨',
        detectedStateColor: '#a0c4ff',
        confidence: 72,
        confidenceLevel: 'medium',
        isDetected: true,
        samples: [{ timestamp: 0, centroid: 300, flux: 0.2, rms: 0.1 }],
        scores: [{ key: 'WIND', score: 72, spectralScore: 60, temporalScore: 80 }],
        temporalFeatures: null,
      },
    });

    expect(report.schema).toBe('trends-fft/v0.1');
    expect(report.detectedState).toBe('WIND');
    expect(report.confidence).toBe(72);
  });
});
