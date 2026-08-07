import { describe, expect, it } from 'vitest';

import {
  buildTriageSnapshot,
  byCodePointId,
  detectGhosts,
  detectOrphans,
  detectStale,
  isTransitional,
  snapshotFingerprint,
  type RegistryTask,
} from './night-triage-core';

const NOW = new Date('2026-07-12T00:00:00Z');
const daysAgo = (d: number): Date => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
const iso = (d: number): string => daysAgo(d).toISOString();

describe('detectGhosts', () => {
  it('active-задача, делящая issue с архивной, → ghost (re-scope, high)', () => {
    const tasks: RegistryTask[] = [
      { id: 'vdr-hard-gate', status: 'active', githubIssue: 47, createdAt: iso(30) },
      { id: 'vdr-hg3', status: 'active', githubIssue: 47, createdAt: iso(30) },
      { id: 'vdr-archived-sibling', status: 'archived', githubIssue: 47 },
    ];
    const g = detectGhosts(tasks, new Map(), NOW);
    expect(g.map((f) => f.id)).toEqual(['vdr-hard-gate', 'vdr-hg3']);
    expect(g[0]).toMatchObject({ category: 'ghost', issue: 47, action: 're-scope', confidence: 'high' });
  });

  it('issue есть только у active-задач (нет архивного сиблинга) → НЕ ghost', () => {
    const tasks: RegistryTask[] = [
      { id: 'a', status: 'active', githubIssue: 100, createdAt: iso(30) },
      { id: 'b', status: 'active', githubIssue: 100, createdAt: iso(30) },
    ];
    expect(detectGhosts(tasks, new Map(), NOW)).toEqual([]);
  });
});

describe('detectOrphans', () => {
  it('active без githubIssue и linearId → orphan (relink, high)', () => {
    const tasks: RegistryTask[] = [
      { id: 'orphan-1', status: 'active', githubIssue: null, linearId: null, createdAt: iso(30) },
      { id: 'has-issue', status: 'active', githubIssue: 380, createdAt: iso(30) },
      { id: 'has-linear', status: 'active', linearId: 'LIN-1', createdAt: iso(30) },
    ];
    const o = detectOrphans(tasks, new Map(), NOW);
    expect(o.map((f) => f.id)).toEqual(['orphan-1']);
    expect(o[0]).toMatchObject({ category: 'orphan', issue: null, action: 'relink', confidence: 'high' });
  });

  it('archived без tracker → НЕ orphan (только active)', () => {
    const tasks: RegistryTask[] = [{ id: 'old', status: 'archived', createdAt: iso(60) }];
    expect(detectOrphans(tasks, new Map(), NOW)).toEqual([]);
  });
});

describe('detectStale', () => {
  it('git-активность старше порога → stale high с dwellDays', () => {
    const tasks: RegistryTask[] = [{ id: 's1', status: 'active', githubIssue: 5, createdAt: iso(60) }];
    const activity = new Map([['s1', daysAgo(20)]]);
    const s = detectStale(tasks, activity, NOW, 14);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ category: 'stale', confidence: 'high', dwellDays: 20, issue: 5 });
  });

  it('git-активность неизвестна → dwell от createdAt, confidence low', () => {
    const tasks: RegistryTask[] = [{ id: 's2', status: 'active', createdAt: iso(30) }];
    const s = detectStale(tasks, new Map(), NOW, 14);
    expect(s[0]).toMatchObject({ confidence: 'low', dwellDays: 30 });
  });

  it('движение свежее порога → НЕ stale', () => {
    const tasks: RegistryTask[] = [{ id: 's3', status: 'active', createdAt: iso(60) }];
    const activity = new Map([['s3', daysAgo(3)]]);
    expect(detectStale(tasks, activity, NOW, 14)).toEqual([]);
  });
});

describe('guard 24ч (переходные состояния)', () => {
  it('активность моложе 24ч → задача не классифицируется', () => {
    const t: RegistryTask = { id: 'fresh', status: 'active', githubIssue: null, linearId: null };
    const activity = new Map([['fresh', new Date(NOW.getTime() - 3 * 60 * 60 * 1000)]]);
    expect(isTransitional(t, activity, NOW)).toBe(true);
    expect(detectOrphans([t], activity, NOW)).toEqual([]);
  });

  it('без данных о времени → не считается переходным', () => {
    const t: RegistryTask = { id: 'x', status: 'active' };
    expect(isTransitional(t, new Map(), NOW)).toBe(false);
  });
});

describe('детерминизм', () => {
  it('сортировка по кодовым точкам id', () => {
    expect([{ id: 'b' }, { id: 'a' }, { id: 'Z' }].sort(byCodePointId).map((x) => x.id)).toEqual([
      'Z',
      'a',
      'b',
    ]);
  });

  it('два прогона на одном срезе дают идентичный снапшот', () => {
    const tasks: RegistryTask[] = [
      { id: 'z-orphan', status: 'active', createdAt: iso(30) },
      { id: 'a-orphan', status: 'active', createdAt: iso(30) },
      { id: 'ghost-x', status: 'active', githubIssue: 47, createdAt: iso(30) },
      { id: 'arch', status: 'archived', githubIssue: 47 },
    ];
    const run1 = buildTriageSnapshot(tasks, new Map(), NOW, 14);
    const run2 = buildTriageSnapshot(tasks, new Map(), NOW, 14);
    expect(JSON.stringify(run1)).toEqual(JSON.stringify(run2));
    expect(run1.orphans.map((f) => f.id)).toEqual(['a-orphan', 'z-orphan']);
    // все 3 active стары (30д, без git-активности) → все stale; orphan/ghost независимо
    expect(run1.counts).toEqual({ ghost: 1, orphan: 2, stale: 3 });
  });
});

describe('гетерогенные поля', () => {
  it('opened вместо createdAt поддержан для dwell/transitional', () => {
    const tasks: RegistryTask[] = [{ id: 'legacy', status: 'active', opened: iso(40) }];
    const s = detectStale(tasks, new Map(), NOW, 14);
    expect(s[0]?.dwellDays).toBe(40);
  });
});

/**
 * Отпечаток состава — основание порога публикации (`#night-triage-yield-zero`).
 *
 * Охраняемое свойство: отпечаток обязан молчать о том, что меняется каждую ночь само
 * (время прогона, счётчик простоя), и говорить о том, что составляет утверждение отчёта.
 * Отпечаток, чувствительный к времени, был бы порогом, всегда открытым — то есть никаким.
 */
describe('snapshotFingerprint', () => {
  const tasks: RegistryTask[] = [
    { id: 'ghost-x', status: 'active', githubIssue: 47, createdAt: iso(30) },
    { id: 'arch', status: 'archived', githubIssue: 47 },
    { id: 'orphan-a', status: 'active', createdAt: iso(30) },
  ];

  it('один состав — один отпечаток', () => {
    const a = buildTriageSnapshot(tasks, new Map(), NOW, 14);
    const b = buildTriageSnapshot(tasks, new Map(), NOW, 14);
    expect(snapshotFingerprint(a)).toEqual(snapshotFingerprint(b));
  });

  it('время прогона в отпечаток НЕ входит: сутки спустя тот же реестр даёт тот же отпечаток', () => {
    const today = buildTriageSnapshot(tasks, new Map(), NOW, 14);
    const tomorrow = buildTriageSnapshot(tasks, new Map(), new Date(NOW.getTime() + 24 * 60 * 60 * 1000), 14);
    expect(tomorrow.generatedAt).not.toEqual(today.generatedAt);
    expect(snapshotFingerprint(tomorrow)).toEqual(snapshotFingerprint(today));
  });

  it('новая карточка в составе меняет отпечаток', () => {
    const before = buildTriageSnapshot(tasks, new Map(), NOW, 14);
    const after = buildTriageSnapshot(
      [...tasks, { id: 'orphan-new', status: 'active', createdAt: iso(30) }],
      new Map(),
      NOW,
      14,
    );
    expect(snapshotFingerprint(after)).not.toEqual(snapshotFingerprint(before));
  });

  it('отпечаток от порядка задач в реестре не зависит', () => {
    const straight = buildTriageSnapshot(tasks, new Map(), NOW, 14);
    const reversed = buildTriageSnapshot([...tasks].reverse(), new Map(), NOW, 14);
    expect(snapshotFingerprint(reversed)).toEqual(snapshotFingerprint(straight));
  });
});
