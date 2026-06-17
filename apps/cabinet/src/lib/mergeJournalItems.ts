import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

/** Merge journal pages by clientEntryId; newer incoming wins on collision. */
export function mergeJournalItemsByClientEntryId(
  existing: readonly LiveJournalItem[],
  incoming: readonly LiveJournalItem[],
): LiveJournalItem[] {
  const map = new Map<string, LiveJournalItem>();
  for (const item of existing) {
    map.set(item.clientEntryId, item);
  }
  for (const item of incoming) {
    map.set(item.clientEntryId, item);
  }
  return [...map.values()];
}
