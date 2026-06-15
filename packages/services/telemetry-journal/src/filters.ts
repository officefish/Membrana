import type { LiveJournalFilter, LiveJournalItem } from './types.js';

export function isLiveJournalDetection(item: LiveJournalItem): boolean {
  return item.kind === 'report' && item.report?.isDetected === true;
}

/** UI + query filter for live journal lists. */
export function matchesLiveJournalFilter(
  item: LiveJournalItem,
  filter: LiveJournalFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'tracks':
      return item.kind === 'track';
    case 'reports':
      return item.kind === 'report';
    case 'detections':
      return isLiveJournalDetection(item);
    default: {
      const exhaustive: never = filter;
      return Boolean(exhaustive);
    }
  }
}

export function countLiveJournalFilters(
  items: readonly LiveJournalItem[],
): Record<LiveJournalFilter, number> {
  const counts: Record<LiveJournalFilter, number> = {
    all: items.length,
    tracks: 0,
    reports: 0,
    detections: 0,
  };

  for (const item of items) {
    if (item.kind === 'track') counts.tracks += 1;
    if (item.kind === 'report') counts.reports += 1;
    if (isLiveJournalDetection(item)) counts.detections += 1;
  }

  return counts;
}

export function findReportsForTrack(
  items: readonly LiveJournalItem[],
  trackId: string,
): readonly LiveJournalItem[] {
  return items.filter(
    (item) => item.kind === 'report' && item.report?.trackId === trackId,
  );
}

export function findTrackForReport(
  items: readonly LiveJournalItem[],
  trackId: string,
): LiveJournalItem | undefined {
  return items.find((item) => item.kind === 'track' && item.track?.trackId === trackId);
}
