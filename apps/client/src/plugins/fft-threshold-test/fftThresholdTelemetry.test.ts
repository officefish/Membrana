import { describe, expect, it, vi, beforeEach } from 'vitest';

import { buildFftThresholdTestReport } from './buildFftThresholdTestReport';
import { logFftThresholdTestResult } from './fftThresholdTelemetry';
import type { ThresholdTestResult } from '@membrana/fft-analyzer-service';

const addReportEntry = vi.fn();

vi.mock('@membrana/telemetry-service', () => ({
  getDefaultTelemetryJournal: () => ({
    addReportEntry,
  }),
}));

function sampleResult(overrides: Partial<ThresholdTestResult> = {}): ThresholdTestResult {
  return {
    testId: 't1',
    startedAt: 1,
    finishedAt: 2,
    frameCount: 1,
    strictness: 'normal',
    mode: 'auto',
    intervalMs: 500,
    thresholds: {
      centroid: { min: 1, max: 2 },
      flux: { min: 0.1, max: 0.2 },
      rms: { min: 0.01, max: 0.02 },
    },
    frames: [
      {
        index: 0,
        timestamp: 1,
        centroid: 100,
        flux: 0.1,
        rms: 0.01,
        centroidInRange: true,
        fluxInRange: true,
        rmsInRange: true,
        metricsInRangeCount: 3,
        framePassed: true,
      },
    ],
    passedCount: 1,
    passRate: 1,
    isDetected: true,
    ...overrides,
  };
}

describe('logFftThresholdTestResult', () => {
  beforeEach(() => {
    addReportEntry.mockClear();
  });

  it('пишет теги analysis и detection при обнаружении', () => {
    const report = buildFftThresholdTestReport(sampleResult({ isDetected: true }));
    logFftThresholdTestResult('mod-1', report);
    expect(addReportEntry).toHaveBeenCalledTimes(1);
    const call = addReportEntry.mock.calls[0]![0] as { tags: string[] };
    expect(call.tags).toContain('analysis');
    expect(call.tags).toContain('detection');
    expect(call.tags).not.toContain('detected');
    expect(call.tags).not.toContain('not-detected');
  });

  it('пишет тег clear при отсутствии детекции', () => {
    const report = buildFftThresholdTestReport(sampleResult({ isDetected: false }));
    logFftThresholdTestResult('mod-1', report);
    const call = addReportEntry.mock.calls[0]![0] as { tags: string[] };
    expect(call.tags).toContain('analysis');
    expect(call.tags).toContain('clear');
    expect(call.tags).not.toContain('detection');
  });
});
