import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

/** Newest track item from a journal list (SF7 node card preview). */
export function findLastJournalTrack(items: readonly LiveJournalItem[]): LiveJournalItem | null {
  let best: LiveJournalItem | null = null;
  for (const item of items) {
    if (item.kind !== 'track' || !item.track) continue;
    if (!best || item.timestamp > best.timestamp) {
      best = item;
    }
  }
  return best;
}
