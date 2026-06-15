import {
  LIVE_JOURNAL_PAGE_SIZE,
  type LiveJournalItem,
} from '@membrana/telemetry-journal-service';

import { fetchTelemetryJournalItems } from '@/api/journal';

/** Walk cursor pages (≤50 each) until exhausted — for cabinet cache + linking. */
export async function fetchAllJournalItems(
  mediaDeviceId: string,
): Promise<LiveJournalItem[]> {
  const all: LiveJournalItem[] = [];
  let cursor: string | null = null;

  do {
    const batch = await fetchTelemetryJournalItems({
      limit: LIVE_JOURNAL_PAGE_SIZE,
      mediaDeviceId,
      cursor,
      filter: 'all',
    });
    all.push(...batch.items);
    cursor = batch.nextCursor;
  } while (cursor);

  return all;
}
