import { describe, expect, it } from 'vitest';
import type { TelemetryEntry } from '@membrana/telemetry-service';

import { countJournalFilters, matchesJournalFilter } from './matchesTagFilter';

function entry(tags: string[]): TelemetryEntry {
  return {
    schemaVersion: 1,
    id: '1',
    timestamp: 0,
    type: 'analysis',
    moduleId: 'm',
    moduleName: 'n',
    data: {},
    tags,
  };
}

describe('matchesJournalFilter', () => {
  it('all пропускает любую запись', () => {
    expect(matchesJournalFilter(entry([]), 'all')).toBe(true);
  });

  it('detection требует тег detection', () => {
    expect(matchesJournalFilter(entry(['analysis', 'detection']), 'detection')).toBe(true);
    expect(matchesJournalFilter(entry(['analysis', 'clear']), 'detection')).toBe(false);
  });

  it('clear требует тег clear', () => {
    expect(matchesJournalFilter(entry(['analysis', 'clear']), 'clear')).toBe(true);
    expect(matchesJournalFilter(entry(['detection']), 'clear')).toBe(false);
  });

  it('analysis требует тег analysis', () => {
    expect(matchesJournalFilter(entry(['analysis']), 'analysis')).toBe(true);
    expect(matchesJournalFilter(entry(['event']), 'analysis')).toBe(false);
  });

  it('event фильтрует по type event', () => {
    const eventEntry = { ...entry(['event']), type: 'event' as const };
    expect(matchesJournalFilter(eventEntry, 'event')).toBe(true);
    expect(matchesJournalFilter(entry(['analysis']), 'event')).toBe(false);
  });

  it('system фильтрует module_start/stop', () => {
    expect(
      matchesJournalFilter({ ...entry([]), type: 'module_start' }, 'system'),
    ).toBe(true);
    expect(matchesJournalFilter(entry(['analysis']), 'system')).toBe(false);
  });
});

describe('countJournalFilters', () => {
  it('считает записи по категориям', () => {
    const entries = [
      entry(['analysis', 'detection']),
      { ...entry(['event']), type: 'event' as const },
      { ...entry([]), type: 'module_start' as const },
    ];
    expect(countJournalFilters(entries)).toEqual({
      all: 3,
      analysis: 1,
      detection: 1,
      clear: 0,
      event: 1,
      system: 1,
    });
  });
});
