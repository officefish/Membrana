import type { TelemetryEntry } from '@membrana/telemetry-service';

export type TelemetryJournalFilter =
  | 'all'
  | 'analysis'
  | 'detection'
  | 'clear'
  | 'event'
  | 'system';

/** @deprecated Используйте TelemetryJournalFilter */
export type TelemetryTagFilter = Exclude<
  TelemetryJournalFilter,
  'event' | 'system'
>;

function hasTag(entry: TelemetryEntry, tag: string): boolean {
  return entry.tags.includes(tag);
}

function hasDetectionTag(entry: TelemetryEntry): boolean {
  return (
    hasTag(entry, 'detection') ||
    hasTag(entry, 'detected') ||
    hasTag(entry, 'drone')
  );
}

function hasClearTag(entry: TelemetryEntry): boolean {
  return (
    hasTag(entry, 'clear') ||
    hasTag(entry, 'not-detected') ||
    hasTag(entry, 'calm')
  );
}

/** Фильтр записей журнала (теги + тип для event/system). */
export function matchesJournalFilter(
  entry: TelemetryEntry,
  filter: TelemetryJournalFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'analysis':
      return hasTag(entry, 'analysis');
    case 'detection':
      return hasDetectionTag(entry);
    case 'clear':
      return hasClearTag(entry);
    case 'event':
      return entry.type === 'event';
    case 'system':
      return entry.type === 'module_start' || entry.type === 'module_stop';
    default:
      return true;
  }
}

/** @deprecated Используйте matchesJournalFilter */
export function matchesTagFilter(
  entry: TelemetryEntry,
  filter: TelemetryTagFilter | TelemetryJournalFilter,
): boolean {
  return matchesJournalFilter(entry, filter);
}

export function countJournalFilters(
  entries: readonly TelemetryEntry[],
): Record<TelemetryJournalFilter, number> {
  const counts: Record<TelemetryJournalFilter, number> = {
    all: entries.length,
    analysis: 0,
    detection: 0,
    clear: 0,
    event: 0,
    system: 0,
  };

  for (const entry of entries) {
    if (hasTag(entry, 'analysis')) counts.analysis += 1;
    if (hasDetectionTag(entry)) counts.detection += 1;
    if (hasClearTag(entry)) counts.clear += 1;
    if (entry.type === 'event') counts.event += 1;
    if (entry.type === 'module_start' || entry.type === 'module_stop') {
      counts.system += 1;
    }
  }

  return counts;
}
