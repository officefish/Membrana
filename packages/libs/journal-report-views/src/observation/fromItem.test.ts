import { describe, expect, it } from 'vitest';

import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import {
  DEVICE_BOARD_OBSERVATION_SCHEMA,
  deviceBoardObservationFromItem,
  trendsFromObservationItem,
} from './fromItem';

describe('deviceBoardObservationFromItem', () => {
  it('parses nested trends report and trackId', () => {
    const item = {
      kind: 'report',
      timestamp: Date.now(),
      report: {
        schema: DEVICE_BOARD_OBSERVATION_SCHEMA,
        reportId: 'obs-1',
        trackId: 'track-abc',
        isDetected: false,
        summaryText: 'test',
        payload: {
          trendsReport: {
            reportId: 'trends-1',
            detectedStateName: 'QUIET',
            isDetected: false,
          },
          audioReady: true,
        },
      },
    } as unknown as LiveJournalItem;

    const parsed = deviceBoardObservationFromItem(item);
    expect(parsed?.trackId).toBe('track-abc');
    expect(parsed?.audioReady).toBe(true);
    expect(trendsFromObservationItem(item)?.reportId).toBe('trends-1');
  });
});
