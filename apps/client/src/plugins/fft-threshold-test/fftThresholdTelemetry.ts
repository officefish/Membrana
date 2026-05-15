import { getDefaultTelemetryJournal } from '@membrana/telemetry-service';
import type { ThresholdTestResult } from '@membrana/fft-analyzer-service';

const MODULE_NAME = 'fft-threshold-test';

function journal() {
  return getDefaultTelemetryJournal();
}

export function logFftThresholdTestResult(
  moduleId: string,
  result: ThresholdTestResult,
): void {
  journal().addReportEntry({
    type: 'analysis',
    moduleId,
    moduleName: MODULE_NAME,
    data: {
      reportUniqueId: `fft-test-${result.testId}`,
      schema: 'fft-threshold-test/v0.1',
      isDetected: result.isDetected,
      passRate: result.passRate,
      passedCount: result.passedCount,
      frameCount: result.frameCount,
      strictness: result.strictness,
      mode: result.mode,
      thresholds: result.thresholds,
      intervalMs: result.intervalMs,
      framesSummary: result.frames.map((f) => ({
        framePassed: f.framePassed,
        metricsInRangeCount: f.metricsInRangeCount,
      })),
    },
    tags: [
      'fft',
      'threshold-test',
      result.isDetected ? 'detected' : 'not-detected',
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
