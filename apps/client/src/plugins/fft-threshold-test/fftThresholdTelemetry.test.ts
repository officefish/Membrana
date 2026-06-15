import { describe, expect, it } from 'vitest';

import { logFftThresholdTestResult } from './fftThresholdTelemetry';
import type { FftThresholdTestReport } from './buildFftThresholdTestReport';

function sampleReport(isDetected: boolean): FftThresholdTestReport {
  return {
    testId: 'test-1',
    isDetected,
    passRate: 0.5,
    passedCount: 1,
    frameCount: 2,
    strictness: 'normal',
    mode: 'live',
    thresholds: { rms: 0.1, flux: 0.2 },
    intervalMs: 100,
    startedAt: 1,
    finishedAt: 2,
    normalization: 'none',
    frames: [],
  };
}

describe('logFftThresholdTestResult', () => {
  it('does not write to legacy journal (TJ3)', () => {
    expect(() => logFftThresholdTestResult('mod-1', sampleReport(true))).not.toThrow();
  });
});
