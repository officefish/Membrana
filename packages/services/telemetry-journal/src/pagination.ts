import { matchesLiveJournalFilter } from './filters.js';
import type { LiveJournalFilter, LiveJournalItem } from './types.js';

/** Max live journal rows per UI/API page (TJ9). */
export const LIVE_JOURNAL_PAGE_SIZE = 50;

export interface PaginateLiveJournalItemsOptions {
  readonly limit?: number;
  readonly cursor?: string | null;
  readonly filter?: LiveJournalFilter;
}

export interface PaginatedLiveJournalItems {
  readonly items: readonly LiveJournalItem[];
  readonly nextCursor: string | null;
}

export interface LiveJournalCursor {
  readonly timestamp: number;
  readonly clientEntryId: string;
}

export function encodeLiveJournalCursor(item: Pick<LiveJournalItem, 'timestamp' | 'clientEntryId'>): string {
  return `${item.timestamp}:${encodeURIComponent(item.clientEntryId)}`;
}

export function decodeLiveJournalCursor(raw: string | null | undefined): LiveJournalCursor | null {
  if (!raw) return null;
  const separator = raw.indexOf(':');
  if (separator <= 0) return null;
  const timestamp = Number(raw.slice(0, separator));
  const clientEntryId = decodeURIComponent(raw.slice(separator + 1));
  if (!Number.isFinite(timestamp) || clientEntryId.length === 0) return null;
  return { timestamp, clientEntryId };
}

function compareLiveJournalItemsDesc(a: LiveJournalItem, b: LiveJournalItem): number {
  if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
  return b.clientEntryId.localeCompare(a.clientEntryId);
}

/** True when `item` is strictly older than cursor position in desc sort. */
export function isLiveJournalItemBeforeCursor(
  item: LiveJournalItem,
  cursor: LiveJournalCursor,
): boolean {
  if (item.timestamp < cursor.timestamp) return true;
  if (item.timestamp > cursor.timestamp) return false;
  return item.clientEntryId < cursor.clientEntryId;
}

export function paginateLiveJournalItems(
  items: readonly LiveJournalItem[],
  options: PaginateLiveJournalItemsOptions = {},
): PaginatedLiveJournalItems {
  const limit = Math.min(
    options.limit ?? LIVE_JOURNAL_PAGE_SIZE,
    LIVE_JOURNAL_PAGE_SIZE,
  );
  const filter = options.filter ?? 'all';
  const cursor = decodeLiveJournalCursor(options.cursor);

  let sorted = items
    .filter((item) => matchesLiveJournalFilter(item, filter))
    .slice()
    .sort(compareLiveJournalItemsDesc);

  if (cursor) {
    sorted = sorted.filter((item) => isLiveJournalItemBeforeCursor(item, cursor));
  }

  const page = sorted.slice(0, limit);
  const nextCursor =
    page.length === limit && sorted.length > limit
      ? encodeLiveJournalCursor(page[limit - 1]!)
      : null;

  return { items: page, nextCursor };
}

export function sliceLiveJournalPage(
  items: readonly LiveJournalItem[],
  pageIndex: number,
  pageSize = LIVE_JOURNAL_PAGE_SIZE,
): readonly LiveJournalItem[] {
  const safePage = Math.max(0, pageIndex);
  const start = safePage * pageSize;
  return items.slice(start, start + pageSize);
}

export function countLiveJournalPages(
  totalItems: number,
  pageSize = LIVE_JOURNAL_PAGE_SIZE,
): number {
  if (totalItems <= 0) return 1;
  return Math.ceil(totalItems / pageSize);
}

/** Case-insensitive search across journal row fields (client/cabinet UI). */
export function matchesLiveJournalSearch(item: LiveJournalItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (item.moduleName.toLowerCase().includes(normalized)) return true;
  if (item.moduleId.toLowerCase().includes(normalized)) return true;
  if (item.tags.some((tag) => tag.toLowerCase().includes(normalized))) return true;
  if (item.track?.title.toLowerCase().includes(normalized)) return true;
  if (item.track?.sampleId.toLowerCase().includes(normalized)) return true;
  if (item.report?.summaryText?.toLowerCase().includes(normalized)) return true;
  if (item.report?.trackId.toLowerCase().includes(normalized)) return true;
  return false;
}
