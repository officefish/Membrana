import { describe, expect, it } from 'vitest';

import { liveJournalItemFromJournalAppendPayload } from './realtime-journal-mapper.js';

describe('liveJournalItemFromJournalAppendPayload', () => {
  it('maps report append payload', () => {
    const item = liveJournalItemFromJournalAppendPayload(
      {
        kind: 'report',
        clientEntryId: 'client-1',
        moduleId: 'microphone',
        moduleName: 'Microphone',
        reportKind: 'drone-detection-brief/v1',
        payload: {
          schema: 'drone-detection-brief/v1',
          reportId: 'r1',
          trackId: 't1',
          isDetected: true,
        },
        serverId: 'srv-1',
      },
      '2026-06-17T12:00:00.000Z',
    );

    expect(item?.kind).toBe('report');
    expect(item?.id).toBe('srv-1');
    expect(item?.report?.isDetected).toBe(true);
  });
});
