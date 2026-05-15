import type { TelemetryEntry } from '@membrana/telemetry-service';

export type TelemetryTagFilter = 'all' | 'analysis' | 'detection' | 'clear';

/** Фильтр по тегам записи (`entry.tags`). */
export function matchesTagFilter(
  entry: TelemetryEntry,
  filter: TelemetryTagFilter,
): boolean {
  if (filter === 'all') return true;
  return entry.tags.includes(filter);
}
