import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import {
  appendTrendsFftJournalReport,
  TRENDS_FFT_JOURNAL_SCHEMA,
} from './appendTrendsFftJournalReport';
import type { TrendsFftReport } from './buildTrendsFftReport';

function sampleReport(isDetected: boolean): TrendsFftReport {
  return {
    reportId: 'trends-1',
    schema: 'trends-fft/v0.1',
    startedAt: 1,
    finishedAt: 2,
    intervalMs: 200,
    measurementsCount: 5,
    mode: 'auto',
    detectedState: 'drone',
    detectedStateName: 'Дрон',
    detectedStateIcon: '🛸',
    confidence: 82,
    confidenceLevel: 'high',
    isDetected,
    scores: [],
    samples: [],
    temporalFeatures: {} as TrendsFftReport['temporalFeatures'],
  };
}

describe('appendTrendsFftJournalReport', () => {
  beforeEach(() => {
    resetDefaultLiveJournalServiceForTests();
    configureDefaultLiveJournalService(createMemoryJournalStorageBackend());
  });

  afterEach(() => {
    resetDefaultLiveJournalServiceForTests();
  });

  it('appends a trends-fft report to the live journal (LP2)', async () => {
    await appendTrendsFftJournalReport({ moduleId: 'mod-1', report: sampleReport(true) });

    const items = getDefaultLiveJournalService().getSnapshot().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.report?.schema).toBe(TRENDS_FFT_JOURNAL_SCHEMA);
    expect(items[0]?.report?.isDetected).toBe(true);
    expect(items[0]?.report?.trackId).toBe('trends-fft:mod-1:trends-1');
  });
});
