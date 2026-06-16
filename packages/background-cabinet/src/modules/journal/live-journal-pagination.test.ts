import { describe, expect, it } from 'vitest';

import { matchesLiveJournalItemRowFilter } from './live-journal-pagination';

describe('matchesLiveJournalItemRowFilter', () => {
  const track = {
    id: 'track-1',
    kind: 'track' as const,
    timestamp: 1,
    clientEntryId: 'track-entry',
    moduleId: 'mic',
    moduleName: 'microphone',
    tags: [],
    track: { trackId: 't1' },
  };
  const detection = {
    id: 'report-1',
    kind: 'report' as const,
    timestamp: 2,
    clientEntryId: 'report-entry',
    moduleId: 'mic',
    moduleName: 'microphone',
    tags: [],
    report: { isDetected: true },
  };
  const clearReport = {
    ...detection,
    id: 'report-2',
    clientEntryId: 'report-entry-2',
    report: { isDetected: false },
  };

  it('matches JE5 filter subsets', () => {
    expect(matchesLiveJournalItemRowFilter(track, 'tracks')).toBe(true);
    expect(matchesLiveJournalItemRowFilter(detection, 'detections')).toBe(true);
    expect(matchesLiveJournalItemRowFilter(clearReport, 'detections')).toBe(false);
    expect(matchesLiveJournalItemRowFilter(track, 'reports')).toBe(false);
  });
});
