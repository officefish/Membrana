import { describe, expect, it } from 'vitest';

import { buildTriageSnapshot, snapshotFingerprint, type TriageSnapshot } from './night-triage-core';
import { extractFingerprint, renderTriageReport } from './night-triage-report';

const base: TriageSnapshot = {
  generatedAt: '2026-07-12T00:00:00.000Z',
  staleThresholdDays: 14,
  ghosts: [
    { id: 'vdr-hard-gate', category: 'ghost', issue: 47, action: 're-scope', confidence: 'high', detail: '' },
  ],
  orphans: [
    { id: 'agent-tooling', category: 'orphan', issue: null, action: 'relink', confidence: 'high', detail: '' },
  ],
  stale: [
    { id: 's-high', category: 'stale', issue: 5, action: 're-scope', confidence: 'high', detail: '', dwellDays: 30 },
    { id: 's-low', category: 'stale', issue: null, action: 're-scope', confidence: 'low', detail: '', dwellDays: 20 },
  ],
  counts: { ghost: 1, orphan: 1, stale: 2 },
};

describe('renderTriageReport', () => {
  const md = renderTriageReport(base, { date: '2026-07-12' });

  it('заголовок + сводка первой строкой', () => {
    expect(md).toContain('# Night Triage 2026-07-12');
    expect(md).toContain('**Сводка:** ghost 1 · orphan 1 · stale 2.');
  });

  it('sink-not-source дисклеймер + порог', () => {
    expect(md).toContain('sink not source');
    expect(md).toContain('Порог stale 14 дн');
  });

  it('ghost-таблица со ссылкой на issue', () => {
    expect(md).toContain('## Ghost (1)');
    expect(md).toContain('[#47](https://github.com/officefish/Membrana/issues/47)');
    expect(md).toContain('| `vdr-hard-gate` |');
  });

  it('stale: high и low в РАЗНЫХ блоках, dwell-time присутствует', () => {
    expect(md).toContain('## Stale (2)');
    expect(md).toContain('| `s-high` | [#5]');
    expect(md).toContain('**Требует проверки (низкая уверенность)**');
    // high-строка раньше блока low
    expect(md.indexOf('s-high')).toBeLessThan(md.indexOf('Требует проверки'));
    expect(md.indexOf('Требует проверки')).toBeLessThan(md.indexOf('s-low'));
    expect(md).toContain('| `s-high` | [#5](https://github.com/officefish/Membrana/issues/5) | 30 | re-scope |');
  });

  it('таблица имеет валидный separator под заголовком', () => {
    expect(md).toContain('| id | issue | действие |\n| --- | --- | --- |');
  });

  it('чистый реестр → «реестр чист» + пустые секции', () => {
    const clean = renderTriageReport(
      { ...base, ghosts: [], orphans: [], stale: [], counts: { ghost: 0, orphan: 0, stale: 0 } },
      { date: '2026-07-12' },
    );
    expect(clean).toContain('реестр чист');
    expect(clean).toContain('_нет находок_');
  });

  it('детерминизм: два рендера идентичны', () => {
    expect(renderTriageReport(base, { date: '2026-07-12' })).toEqual(
      renderTriageReport(base, { date: '2026-07-12' }),
    );
  });

  it('кастомный repoSlug в ссылках', () => {
    const m = renderTriageReport(base, { date: '2026-07-12', repoSlug: 'acme/repo' });
    expect(m).toContain('https://github.com/acme/repo/issues/47');
  });
});

/**
 * Маркер отпечатка (`#night-triage-yield-zero`): порог публикации сравнивает срез с тем,
 * что ПОЛУЧИЛ СТВОЛ, поэтому основание сравнения обязано ехать внутри самого отчёта.
 */
describe('маркер отпечатка', () => {
  const snapshot = buildTriageSnapshot(
    [
      { id: 'ghost-x', status: 'active', githubIssue: 47, createdAt: '2026-06-01T00:00:00Z' },
      { id: 'arch', status: 'archived', githubIssue: 47 },
    ],
    new Map(),
    new Date('2026-07-12T00:00:00Z'),
    14,
  );

  it('отчёт несёт отпечаток, и он читается обратно', () => {
    const report = renderTriageReport(snapshot, { date: '2026-07-12' });
    expect(extractFingerprint(report)).toEqual(snapshotFingerprint(snapshot));
  });

  it('маркер — html-комментарий: читателю отчёта в глаза не лезет', () => {
    const report = renderTriageReport(snapshot, { date: '2026-07-12' });
    const marked = report.split('\n').find((l) => l.includes('night-triage:fingerprint'));
    expect(marked?.startsWith('<!--')).toBe(true);
    expect(marked?.endsWith('-->')).toBe(true);
  });

  it('отчёт без маркера → null, а не пустая строка: «основания нет» отличимо', () => {
    expect(extractFingerprint('# Night Triage 2026-07-01\n\nстарый отчёт\n')).toBeNull();
  });

  it('битый маркер отпечатком не считается', () => {
    expect(extractFingerprint('<!-- night-triage:fingerprint не-хеш -->')).toBeNull();
  });
});
