import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import { logFftThresholdTestResult } from './fftThresholdTelemetry';
import { FFT_THRESHOLD_JOURNAL_SCHEMA } from './appendFftThresholdJournalReport';
import type { FftThresholdTestReport } from './buildFftThresholdTestReport';

function sampleReport(isDetected: boolean): FftThresholdTestReport {
  return {
    testId: 'test-1',
    isDetected,
    passRate: 0.5,
    passedCount: 1,
    frameCount: 2,
    strictness: 'normal',
    mode: 'auto',
    thresholds: {
      centroid: { min: 100, max: 8000 },
      flux: { min: 0, max: 0.3 },
      rms: { min: 0, max: 0.4 },
    },
    intervalMs: 100,
    startedAt: 1,
    finishedAt: 2,
    normalization: { centroidHzMax: 8000, fluxRefMax: 1, loudnessRefMax: 1 },
    frames: [],
  };
}

describe('logFftThresholdTestResult', () => {
  beforeEach(() => {
    resetDefaultLiveJournalServiceForTests();
    configureDefaultLiveJournalService(createMemoryJournalStorageBackend());
  });

  afterEach(() => {
    resetDefaultLiveJournalServiceForTests();
  });

  it('appends an fft-threshold report to the live journal (LP2)', async () => {
    logFftThresholdTestResult('mod-1', sampleReport(true));

    await vi.waitFor(() => {
      const items = getDefaultLiveJournalService().getSnapshot().items;
      expect(items).toHaveLength(1);
    });

    const report = getDefaultLiveJournalService().getSnapshot().items[0]?.report;
    expect(report?.schema).toBe(FFT_THRESHOLD_JOURNAL_SCHEMA);
    expect(report?.isDetected).toBe(true);
    expect(report?.trackId).toBe('fft-threshold:mod-1:test-1');
  });
});
