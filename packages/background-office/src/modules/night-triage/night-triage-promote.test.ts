import { describe, expect, it } from 'vitest';

import { buildTriageSnapshot, type RegistryTask } from './night-triage-core';
import {
  answerPrimaryFocus,
  insightYield,
  promoteCandidates,
  validateDraftVerdicts,
  validateScorecard,
} from './night-triage-promote';

const NOW = new Date('2026-08-12T02:00:00Z');

function task(over: Partial<RegistryTask> & { id: string }): RegistryTask {
  return { status: 'active', createdAt: '2026-07-01', githubIssue: null, linearId: null, ...over };
}

function snapshotOf(tasks: RegistryTask[]) {
  return buildTriageSnapshot(tasks, new Map(), NOW, 14);
}

describe('promoteCandidates (#1445 п.1–п.2)', () => {
  it('счётчики сами по себе кандидатов не рождают: orphan/stale без магистрали и без системной доли → cards 0', () => {
    const snap = snapshotOf([
      task({ id: 'a' }), // orphan + stale
      task({ id: 'b', githubIssue: 5 }), // stale
      task({ id: 'c', githubIssue: 6 }),
    ]);
    expect(promoteCandidates(snap, { magistral: 'что-то-другое', activeTotal: 3 })).toEqual([]);
  });

  it('R1: магистраль дня в срезе (stale) — кандидат с id и причиной', () => {
    const snap = snapshotOf([task({ id: 'tariff-promo-server-wiring', githubIssue: 1761 })]);
    const cards = promoteCandidates(snap, { magistral: 'tariff-promo-server-wiring', activeTotal: 100 });
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('magistral-in-triage-tariff-promo-server-wiring');
    expect(cards[0].reason).toContain('магистраль дня');
    expect(validateScorecard(cards[0].scorecard)).toEqual([]);
  });

  it('R2: orphan > 50% активного реестра — системная находка (цифра комнаты 158/212)', () => {
    const orphans = Array.from({ length: 158 }, (_, i) => task({ id: `o-${String(i).padStart(3, '0')}` }));
    const snap = snapshotOf(orphans);
    const cards = promoteCandidates(snap, { magistral: null, activeTotal: 212 });
    expect(cards.map((c) => c.id)).toEqual(['orphan-share-systemic']);
    expect(cards[0].reason).toContain('158 из 212');
    expect(cards[0].reason).toContain('75%');
  });
});

describe('answerPrimaryFocus (#1445 п.5)', () => {
  it('одна строка на пункт; непересечение названо явно', () => {
    const snap = snapshotOf([task({ id: 'a' })]);
    const lines = answerPrimaryFocus(snap, 'x-magistral');
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line).toContain('не затронута');
  });

  it('нет магистрали — «стык не проверен», а не «пересечения нет»', () => {
    const snap = snapshotOf([]);
    const lines = answerPrimaryFocus(snap, null);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('стык не проверен');
  });
});

describe('вердикты пачки и scorecard — закрытые enum (#1445 п.3–п.4)', () => {
  it('строка без вердикта роняет проверку с именем PR', () => {
    const problems = validateDraftVerdicts([
      { date: '2026-08-10', pr: 1841, verdict: 'оставим открытым', cardId: null, why: 'ну пусть висит' },
    ]);
    expect(problems.some((p) => p.includes('PR #1841') && p.includes('«оставим открытым» в перечне нет'))).toBe(true);
  });

  it('doc_merge/squash_memo без cardId — problem; close_no_card без cardId легален', () => {
    const problems = validateDraftVerdicts([
      { date: '2026-08-10', pr: 1, verdict: 'doc_merge', cardId: '', why: 'x' },
      { date: '2026-08-10', pr: 2, verdict: 'close_no_card', cardId: null, why: 'счётчики без наблюдения' },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('PR #1');
  });

  it('свободный текст в scorecard не проходит', () => {
    const problems = validateScorecard({ gap: 'огромный', cost: 's', reversible: 'yes' });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('gap');
  });
});

describe('insight_yield — метрика v0 (Дынин)', () => {
  it('на окне 25–28.07 даёт ровно 0 (база комнаты)', () => {
    const { value, text } = insightYield(0, 4);
    expect(value).toBe(0);
    expect(text).toBe('insight_yield = 0/4 = 0.00');
  });

  it('считается и печатается; кривой вход — throw', () => {
    expect(insightYield(2, 4).value).toBe(0.5);
    expect(() => insightYield(-1, 4)).toThrow();
  });
});
