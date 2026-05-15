import { describe, expect, it } from 'vitest';
import type { TelemetryEntry } from '@membrana/telemetry-service';

import { buildFftThresholdTestReport } from '../../../plugins/fft-threshold-test/buildFftThresholdTestReport';
import type { ThresholdTestResult } from '@membrana/fft-analyzer-service';

import {
  fftThresholdReportFromEntry,
  FFT_THRESHOLD_TELEMETRY_SCHEMA,
} from './fftThresholdReportFromEntry';

function sampleResult(): ThresholdTestResult {
  return {
    testId: 'test-abc',
    startedAt: 1_000,
    finishedAt: 2_000,
    frameCount: 1,
    strictness: 'normal',
    mode: 'manual',
    intervalMs: 500,
    thresholds: {
      centroid: { min: 500, max: 1250 },
      flux: { min: 0.2, max: 1.5 },
      rms: { min: 0.03, max: 0.35 },
    },
    frames: [
      {
        index: 0,
        timestamp: 1100,
        centroid: 600,
        flux: 0.3,
        rms: 0.05,
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
  };
}

function analysisEntry(data: Record<string, unknown>): TelemetryEntry {
  return {
    schemaVersion: 1,
    id: 'e1',
    timestamp: 2_000,
    type: 'analysis',
    moduleId: 'mod',
    moduleName: 'fft-threshold-test',
    tags: ['analysis', 'detection'],
    data,
  };
}

describe('fftThresholdReportFromEntry', () => {
  it('валидный v0.2 payload → DTO', () => {
    const report = buildFftThresholdTestReport(sampleResult());
    const entry = analysisEntry({
      reportUniqueId: `fft-test-${report.testId}`,
      schema: FFT_THRESHOLD_TELEMETRY_SCHEMA,
      isDetected: report.isDetected,
      passRate: report.passRate,
      passedCount: report.passedCount,
      frameCount: report.frameCount,
      strictness: report.strictness,
      mode: report.mode,
      thresholds: report.thresholds,
      intervalMs: report.intervalMs,
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      normalization: report.normalization,
      frames: report.frames,
    });

    const dto = fftThresholdReportFromEntry(entry);
    expect(dto).not.toBeNull();
    expect(dto?.testId).toBe('test-abc');
    expect(dto?.frames).toHaveLength(1);
    expect(dto?.isDetected).toBe(true);
  });

  it('битый payload → null', () => {
    const entry = analysisEntry({ schema: FFT_THRESHOLD_TELEMETRY_SCHEMA });
    expect(fftThresholdReportFromEntry(entry)).toBeNull();
  });

  it('неизвестная schema → null', () => {
    const entry = analysisEntry({ schema: 'other/v0.1', reportUniqueId: 'fft-test-x' });
    expect(fftThresholdReportFromEntry(entry)).toBeNull();
  });
});
