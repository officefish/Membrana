import type { LiveJournalItemRow } from './live-journal-items.mapper';

export const LIVE_JOURNAL_PAGE_SIZE = 50;

export type LiveJournalFilter = 'all' | 'tracks' | 'reports' | 'detections';

function matchesFilter(item: LiveJournalItemRow, filter: LiveJournalFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'tracks':
      return item.kind === 'track';
    case 'reports':
      return item.kind === 'report';
    case 'detections':
      return item.kind === 'report' && item.report?.isDetected === true;
    default:
      return true;
  }
}

function compareDesc(a: LiveJournalItemRow, b: LiveJournalItemRow): number {
  if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
  return b.clientEntryId.localeCompare(a.clientEntryId);
}

function decodeCursor(raw?: string): { timestamp: number; clientEntryId: string } | null {
  if (!raw) return null;
  const separator = raw.indexOf(':');
  if (separator <= 0) return null;
  const timestamp = Number(raw.slice(0, separator));
  const clientEntryId = decodeURIComponent(raw.slice(separator + 1));
  if (!Number.isFinite(timestamp) || clientEntryId.length === 0) return null;
  return { timestamp, clientEntryId };
}

function encodeCursor(item: Pick<LiveJournalItemRow, 'timestamp' | 'clientEntryId'>): string {
  return `${item.timestamp}:${encodeURIComponent(item.clientEntryId)}`;
}

function isBeforeCursor(
  item: LiveJournalItemRow,
  cursor: { timestamp: number; clientEntryId: string },
): boolean {
  if (item.timestamp < cursor.timestamp) return true;
  if (item.timestamp > cursor.timestamp) return false;
  return item.clientEntryId < cursor.clientEntryId;
}

/** Paginate merged cabinet journal rows (TJ9, CJS-safe duplicate). */
export function paginateLiveJournalItemRows(
  items: readonly LiveJournalItemRow[],
  options: {
    limit?: number;
    cursor?: string;
    filter?: LiveJournalFilter;
  } = {},
): { items: LiveJournalItemRow[]; nextCursor: string | null } {
  const limit = Math.min(options.limit ?? LIVE_JOURNAL_PAGE_SIZE, LIVE_JOURNAL_PAGE_SIZE);
  const filter = options.filter ?? 'all';
  const cursor = decodeCursor(options.cursor);

  let sorted = items.filter((item) => matchesFilter(item, filter)).slice().sort(compareDesc);
  if (cursor) {
    sorted = sorted.filter((item) => isBeforeCursor(item, cursor));
  }

  const page = sorted.slice(0, limit);
  const nextCursor =
    page.length === limit && sorted.length > limit
      ? encodeCursor(page[limit - 1]!)
      : null;

  return { items: page, nextCursor };
}

export function matchesLiveJournalItemRowFilter(
  item: LiveJournalItemRow,
  filter: LiveJournalFilter,
): boolean {
  return matchesFilter(item, filter);
}

export function parseLiveJournalFilter(raw?: string): LiveJournalFilter {
  if (raw === 'tracks' || raw === 'reports' || raw === 'detections') return raw;
  return 'all';
}

export type LiveJournalFilterCounts = Record<LiveJournalFilter, number>;

/** Authoritative filter badge counts for merged journal rows (JS1). */
export function countLiveJournalItemRowFilters(
  items: readonly LiveJournalItemRow[],
): LiveJournalFilterCounts {
  const counts: LiveJournalFilterCounts = {
    all: items.length,
    tracks: 0,
    reports: 0,
    detections: 0,
  };

  for (const item of items) {
    if (item.kind === 'track') counts.tracks += 1;
    if (item.kind === 'report') counts.reports += 1;
    if (item.kind === 'report' && item.report?.isDetected === true) counts.detections += 1;
  }

  return counts;
}
