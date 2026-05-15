import { getDefaultTelemetryJournal } from '@membrana/telemetry-service';

import type { FftThresholdTestReport } from './buildFftThresholdTestReport';

const MODULE_NAME = 'fft-threshold-test';
const SCHEMA = 'fft-threshold-test/v0.2';

function journal() {
  return getDefaultTelemetryJournal();
}

export function logFftThresholdTestResult(
  moduleId: string,
  report: FftThresholdTestReport,
): void {
  journal().addReportEntry({
    type: 'analysis',
    moduleId,
    moduleName: MODULE_NAME,
    data: {
      reportUniqueId: `fft-test-${report.testId}`,
      schema: SCHEMA,
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
    },
    tags: [
      'fft',
      'threshold-test',
      report.isDetected ? 'detected' : 'not-detected',
    ],
  });
}

export function logFftThresholdStreamStart(moduleId: string): void {
  journal().addEntry({
    type: 'event',
    moduleId,
    moduleName: MODULE_NAME,
    data: { action: 'analysis_start' },
    tags: ['fft', 'threshold-test', 'start'],
  });
}

export function logFftThresholdStreamStop(moduleId: string): void {
  journal().addEntry({
    type: 'event',
    moduleId,
    moduleName: MODULE_NAME,
    data: { action: 'analysis_stop' },
    tags: ['fft', 'threshold-test', 'stop'],
  });
}
