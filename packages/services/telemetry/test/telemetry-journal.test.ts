import { describe, expect, it, beforeEach } from 'vitest';

import {
  TelemetryJournal,
  createTelemetryJournal,
  resetDefaultTelemetryJournalForTests,
} from '../src/service.js';

beforeEach(() => {
  resetDefaultTelemetryJournalForTests();
});

function baseEntry(
  overrides: Partial<{
    moduleId: string;
    moduleName: string;
    type: 'analysis' | 'event' | 'module_start' | 'module_stop';
    data: Record<string, unknown>;
    tags: string[];
  }> = {},
) {
  return {
    type: 'analysis' as const,
    moduleId: 'm1',
    moduleName: 'Test',
    data: { tags: ['calm'] },
    tags: ['analysis'],
    ...overrides,
  };
}

describe('TelemetryJournal', () => {
  it('добавляет запись и отдаёт по убыванию времени в getEntries', () => {
    const j = new TelemetryJournal();
    j.addEntry(baseEntry({ data: { tags: ['a'] } }));
    j.addEntry(baseEntry({ data: { tags: ['b'] } }));
    const sorted = j.getEntries();
    expect(sorted.length).toBe(2);
    expect(sorted[0]!.timestamp).toBeGreaterThanOrEqual(sorted[1]!.timestamp);
  });

  it('ограничивает размер буфера, вытесняя самые старые', () => {
    const j = new TelemetryJournal({ maxEntries: 3 });
    j.addEntry(baseEntry({ data: { n: 1 } }));
    j.addEntry(baseEntry({ data: { n: 2 } }));
    j.addEntry(baseEntry({ data: { n: 3 } }));
    j.addEntry(baseEntry({ data: { n: 4 } }));
    expect(j.getEntries().length).toBe(3);
  });

  it('addReportEntry отклоняет дубликат reportUniqueId', () => {
    const j = new TelemetryJournal();
    const data = { reportUniqueId: 'r1', tags: ['drone'] };
    const id1 = j.addReportEntry(baseEntry({ data }));
    const id2 = j.addReportEntry(baseEntry({ data }));
    expect(id1).toBeTruthy();
    expect(id2).toBeNull();
    expect(j.getEntries().filter((e) => e.type === 'analysis').length).toBe(1);
  });

  it('после вытеснения старого отчёта тот же reportUniqueId можно добавить снова', () => {
    const j = new TelemetryJournal({ maxEntries: 2 });
    j.addReportEntry(
      baseEntry({ data: { reportUniqueId: 'old', tags: [] } }),
    );
    j.addReportEntry(
      baseEntry({ data: { reportUniqueId: 'mid', tags: [] } }),
    );
    j.addReportEntry(
      baseEntry({ data: { reportUniqueId: 'new', tags: [] } }),
    );
    const id = j.addReportEntry(
      baseEntry({ data: { reportUniqueId: 'old', tags: [] } }),
    );
    expect(id).toBeTruthy();
  });

  it('subscribe вызывается при изменении', () => {
    const j = new TelemetryJournal();
    let n = 0;
    const unsub = j.subscribe(() => {
      n += 1;
    });
    j.addEntry(baseEntry());
    expect(n).toBeGreaterThan(0);
    unsub();
    const k = n;
    j.addEntry(baseEntry());
    expect(n).toBe(k);
  });

  it('registerModule и unregisterModule пишут system-события', () => {
    const j = new TelemetryJournal();
    const id = j.registerModule('ModA');
    expect(typeof id).toBe('string');
    expect(
      j.getEntriesByType('module_start').some((e) => e.moduleName === 'ModA'),
    ).toBe(true);
    j.unregisterModule(id);
    expect(
      j.getEntriesByType('module_stop').some((e) => e.moduleId === id),
    ).toBe(true);
  });

  it('getStats считает analysis и теги detection/clear по entry.tags', () => {
    const j = new TelemetryJournal();
    j.addEntry(
      baseEntry({
        type: 'event',
        data: {},
        tags: ['e'],
      }),
    );
    j.addReportEntry(
      baseEntry({
        data: { reportUniqueId: 'x' },
        tags: ['analysis', 'detection', 'clear'],
      }),
    );
    const s = j.getStats();
    expect(s.total).toBe(2);
    expect(s.analysis).toBe(1);
    expect(s.detection).toBe(1);
    expect(s.clear).toBe(1);
    expect(s.drone).toBe(1);
    expect(s.calm).toBe(1);
    expect(s.events).toBe(1);
  });

  it('clearOldEntries удаляет устаревшие записи', () => {
    const j = new TelemetryJournal();
    j.addEntry(baseEntry());
    j.clearOldEntries(0);
    expect(j.getEntries().length).toBe(0);
  });

  it('createTelemetryJournal изолирован от синглтона', () => {
    const a = createTelemetryJournal();
    const b = createTelemetryJournal();
    a.addEntry(baseEntry({ data: { k: 'a' } }));
    b.addEntry(baseEntry({ data: { k: 'b' } }));
    expect(a.getEntries().length).toBe(1);
    expect(b.getEntries().length).toBe(1);
  });
});
