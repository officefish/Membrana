import type { LiveJournalItem } from './types.js';

export const JOURNAL_LOCAL_CACHE_PREFIX = 'membrana.liveJournal.cache.v1';

/** Stable localStorage key for paired journal rehydrate (TJ6). */
export function journalLocalCacheKey(scope: string): string {
  return `${JOURNAL_LOCAL_CACHE_PREFIX}:${scope}`;
}

function isLiveJournalItem(value: unknown): value is LiveJournalItem {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as LiveJournalItem;
  return (
    typeof row.id === 'string' &&
    (row.kind === 'track' || row.kind === 'report') &&
    typeof row.timestamp === 'number' &&
    typeof row.clientEntryId === 'string'
  );
}

/** Read persisted journal snapshot from browser localStorage. */
export function readJournalLocalCache(key: string): readonly LiveJournalItem[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items = parsed.filter(isLiveJournalItem);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

/** Persist journal snapshot for session rehydrate (TJ6). */
export function writeJournalLocalCache(key: string, items: readonly LiveJournalItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* quota or private mode — keep in-memory only */
  }
}

/** Remove persisted journal snapshot (e.g. on disconnect). */
export function clearJournalLocalCache(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
