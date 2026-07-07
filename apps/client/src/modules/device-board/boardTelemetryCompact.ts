import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

/** BTJ2: сколько последних записей телеметрии показывать в компакт-панели сайдбара. */
export const BOARD_TELEMETRY_JOURNAL_LIMIT = 20;

/**
 * BTJ2: последние N записей журнала телеметрии (треки/отчёты) — новые сверху.
 * Компакт-панель сайдбара борда: без фильтров/поиска полного модуля, только хвост.
 */
export function compactLiveJournalItems(
  items: readonly LiveJournalItem[],
  limit: number = BOARD_TELEMETRY_JOURNAL_LIMIT,
): readonly LiveJournalItem[] {
  return [...items]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, Math.max(0, limit));
}
