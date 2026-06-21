import { describe, expect, it } from 'vitest';

import { buildTrendsFftReport } from '@/plugins/trends-fft-analyzer/buildTrendsFftReport';

import {
  createTrendsFftScenarioReportPayload,
  TRENDS_FFT_SCENARIO_REPORT_SCHEMA,
} from './makeTrendsFftScenarioReportPayload';

describe('createTrendsFftScenarioReportPayload (B2)', () => {
  it('builds trends-fft/v0.1 payload for PublishReport', () => {
    const fftReport = buildTrendsFftReport({
      reportId: 'rep-b2-1',
      startedAt: 1000,
      finishedAt: 2000,
      intervalMs: 500,
      measurementsCount: 5,
      mode: 'auto',
      result: {
        detectedState: 'DRONE_TIGHT',
        detectedStateName: 'Drone tight',
        detectedStateIcon: '🛸',
        confidence: 0.82,
        confidenceLevel: 'high',
        isDetected: true,
        scores: [],
        samples: [],
        temporalFeatures: {
          centroidMean: 0,
          centroidStd: 0,
          fluxMean: 0,
          fluxStd: 0,
          rmsMean: 0,
          rmsStd: 0,
        },
      },
    });

    const payload = createTrendsFftScenarioReportPayload('device-board', fftReport);

    expect(payload.schema).toBe(TRENDS_FFT_SCENARIO_REPORT_SCHEMA);
    expect(payload.reportId).toBe('rep-b2-1');
    expect(payload.trackId).toBe('trends-fft:device-board:rep-b2-1');
    expect(payload.isDetected).toBe(true);
    expect(payload.summaryText).toContain('Drone tight');
    expect(payload.payload.report).toMatchObject({
      reportId: 'rep-b2-1',
      schema: 'trends-fft/v0.1',
      measurementsCount: 5,
      intervalMs: 500,
    });
  });
});
