import { describe, expect, it } from 'vitest';

import { cabinetRowsToLiveJournalItems } from './live-journal-items.mapper';

describe('cabinetRowsToLiveJournalItems', () => {
  it('merges telemetry track live records and drone reports', () => {
    const items = cabinetRowsToLiveJournalItems(
      [
        {
          id: 'rep-1',
          reportKind: 'drone-detection-report/v1',
          clientEntryId: 'live-report-r1',
          moduleId: 'mic',
          moduleName: 'microphone',
          finishedAt: '2026-06-15T12:00:05.000Z',
          payload: {
            schema: 'drone-detection-report/v1',
            reportId: 'r1',
            trackId: 't1',
            isDetected: true,
            payload: {},
          },
          tags: ['live', 'report', 'detection'],
        },
      ],
      [
        {
          id: 'track-1',
          recordKind: 'telemetry-track/v1',
          clientRecordId: 'live-track-t1',
          moduleId: 'mic',
          startedAt: '2026-06-15T12:00:00.000Z',
          payload: {
            item: {
              schema: 'telemetry-track/v1',
              trackId: 't1',
              sampleId: 'sample-t1',
              title: 'mic-auto-5s',
              durationSec: 5,
              sampleRate: 48_000,
              captureMode: 'auto',
              createdAtIso: '2026-06-15T12:00:00.000Z',
            },
          },
        },
      ],
    );

    expect(items).toHaveLength(2);
    expect(items.some((row) => row.kind === 'track')).toBe(true);
    expect(items.some((row) => row.kind === 'report')).toBe(true);
  });
});
