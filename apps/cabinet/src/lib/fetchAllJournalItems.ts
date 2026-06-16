import {
  LIVE_JOURNAL_PAGE_SIZE,
  type LiveJournalFilter,
  type LiveJournalItem,
} from '@membrana/telemetry-journal-service';

import { fetchTelemetryJournalItems } from '@/api/journal';

export interface FetchAllJournalItemsResult {
  readonly items: LiveJournalItem[];
  readonly counts: Record<LiveJournalFilter, number>;
}

/** Walk cursor pages (≤50 each) until exhausted — for cabinet cache + linking. */
export async function fetchAllJournalItems(
  mediaDeviceId: string,
): Promise<FetchAllJournalItemsResult> {
  const all: LiveJournalItem[] = [];
  let cursor: string | null = null;
  let counts: Record<LiveJournalFilter, number> = {
    all: 0,
    tracks: 0,
    reports: 0,
    detections: 0,
  };

  do {
    const batch = await fetchTelemetryJournalItems({
      limit: LIVE_JOURNAL_PAGE_SIZE,
      mediaDeviceId,
      cursor,
      filter: 'all',
    });
    all.push(...batch.items);
    counts = batch.counts;
    cursor = batch.nextCursor;
  } while (cursor);

  return { items: all, counts };
}
