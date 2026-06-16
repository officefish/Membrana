import { describe, expect, it } from 'vitest';

import {
  countLiveJournalItemRowFilters,
  matchesLiveJournalItemRowFilter,
  paginateLiveJournalItemRows,
} from './live-journal-pagination';

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

describe('countLiveJournalItemRowFilters', () => {
  it('counts 60 tracks and 15 detections (JS3 scenario)', () => {
    const tracks = Array.from({ length: 60 }, (_, index) => ({
      id: `track-${index}`,
      kind: 'track' as const,
      timestamp: 10_000 - index,
      clientEntryId: `track-${index}`,
      moduleId: 'mic',
      moduleName: 'microphone',
      tags: [],
      track: { trackId: `t-${index}` },
    }));
    const detections = Array.from({ length: 15 }, (_, index) => ({
      id: `det-${index}`,
      kind: 'report' as const,
      timestamp: 5_000 - index,
      clientEntryId: `det-${index}`,
      moduleId: 'mic',
      moduleName: 'microphone',
      tags: [],
      report: { isDetected: true },
    }));
    const rows = [...tracks, ...detections];
    const counts = countLiveJournalItemRowFilters(rows);
    expect(counts).toEqual({
      all: 75,
      tracks: 60,
      reports: 15,
      detections: 15,
    });
    expect(counts.detections).toBe(15);
    expect(Math.ceil(counts.tracks / 50)).toBe(2);
    expect(Math.ceil(counts.detections / 50)).toBe(1);

    const trackPage1 = paginateLiveJournalItemRows(rows, { filter: 'tracks', limit: 50 });
    expect(trackPage1.items).toHaveLength(50);
    expect(trackPage1.nextCursor).not.toBeNull();

    const detectionPage = paginateLiveJournalItemRows(rows, { filter: 'detections', limit: 50 });
    expect(detectionPage.items).toHaveLength(15);
    expect(detectionPage.nextCursor).toBeNull();
  });
});
