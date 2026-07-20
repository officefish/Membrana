/**
 * Тесты classifyWorktree (K2, #717).
 *
 * Предикат кормит снос — ценность тестов в том, что живое НЕ попадает в
 * sprint-closed. Каждый класс из вердикта M1 worktree-hygiene-gaps закреплён
 * кейсом; детерминизм — прогон дважды на одном входе.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CANON_NAMES,
  WORKTREE_CLASSES,
  classifyWorktree,
  parseWorktreeCard,
  prClosed,
  shouldTeardown,
} from './lib/classify-worktree.mjs';

const sprintCard = { kind: 'sprint' };
const base = {
  path: 'C:/w/Membrana-x',
  branch: 'feat/x',
  card: sprintCard,
  dirtyCount: 0,
  unpushedCount: 0,
  pr: null,
};

// ─── canon: сносу не подлежит никогда ─────────────────────────────────────────────

test('canon-карточка → canon, даже с merged PR и чистым деревом', () => {
  const c = classifyWorktree({
    ...base,
    card: { kind: 'canon', canonName: 'product' },
    pr: { number: 700, state: 'MERGED' },
  });
  assert.equal(c.class, 'canon');
  assert.match(c.reasons.join(' '), /product/);
  assert.equal(shouldTeardown(c), false);
});

test('каноническое множество закрыто и перечислимо (M1)', () => {
  assert.deepEqual([...CANON_NAMES], ['main', 'tooling', 'product', 'codex', 'cursor']);
});

// ─── sprint-closed: единственный класс под снос ───────────────────────────────────

test('sprint + MERGED PR + чистое дерево → sprint-closed', () => {
  const c = classifyWorktree({ ...base, pr: { number: 731, state: 'MERGED' } });
  assert.equal(c.class, 'sprint-closed');
  assert.match(c.reasons[0], /#731 MERGED/, 'provenance строки обязателен');
  assert.equal(shouldTeardown(c), true);
});

test('sprint + CLOSED PR (отклонённая работа) → sprint-closed', () => {
  const c = classifyWorktree({ ...base, pr: { number: 5, state: 'CLOSED' } });
  assert.equal(c.class, 'sprint-closed');
});

// ─── sprint-open: живая работа не сносится ────────────────────────────────────────

test('merged PR, но грязное дерево → sprint-open (работа не доехала)', () => {
  const c = classifyWorktree({ ...base, pr: { number: 8, state: 'MERGED' }, dirtyCount: 3 });
  assert.equal(c.class, 'sprint-open');
  assert.match(c.reasons.join(' '), /3 незакоммиченных/);
});

test('merged PR, но незапушенные коммиты → sprint-open (единственная копия работы)', () => {
  const c = classifyWorktree({ ...base, pr: { number: 8, state: 'MERGED' }, unpushedCount: 2 });
  assert.equal(c.class, 'sprint-open');
  assert.match(c.reasons.join(' '), /2 незапушенных/);
});

test('открытый PR → sprint-open', () => {
  const c = classifyWorktree({ ...base, pr: { number: 9, state: 'OPEN' } });
  assert.equal(c.class, 'sprint-open');
  assert.match(c.reasons[0], /открытый PR #9/);
});

test('PR не заведён → sprint-open (работа ещё локальная)', () => {
  const c = classifyWorktree({ ...base });
  assert.equal(c.class, 'sprint-open');
});

// ─── unregistered / unknown: fail-closed ──────────────────────────────────────────

test('без карточки → unregistered (хвост, разбор человеку), не снос', () => {
  const c = classifyWorktree({ ...base, card: null, pr: { number: 10, state: 'MERGED' } });
  assert.equal(c.class, 'unregistered');
  assert.equal(shouldTeardown(c), false);
});

test('gh недоступен → unknown, не сносить', () => {
  const c = classifyWorktree({ ...base, ghUnavailable: true, pr: null });
  assert.equal(c.class, 'unknown');
  assert.equal(shouldTeardown(c), false);
});

test('detached HEAD у sprint-дерева → unknown, разбирать вручную', () => {
  const c = classifyWorktree({ ...base, branch: null });
  assert.equal(c.class, 'unknown');
});

// ─── детерминизм (M1: бит-в-бит на одном снимке) ──────────────────────────────────

test('два прогона на одном входе дают идентичную разметку', () => {
  const input = { ...base, pr: { number: 12, state: 'MERGED' }, dirtyCount: 1 };
  assert.deepEqual(classifyWorktree(input), classifyWorktree(input));
});

test('все выдаваемые классы — из словаря WORKTREE_CLASSES', () => {
  const inputs = [
    { ...base, card: { kind: 'canon' } },
    { ...base, pr: { number: 1, state: 'MERGED' } },
    { ...base, pr: { number: 1, state: 'OPEN' } },
    { ...base, card: null },
    { ...base, ghUnavailable: true },
  ];
  for (const w of inputs) {
    assert.ok(WORKTREE_CLASSES.includes(classifyWorktree(w).class));
  }
});

// ─── parseWorktreeCard ────────────────────────────────────────────────────────────

test('карточка-таблица: kind/canonName/база/владелец', () => {
  const card = parseWorktreeCard(
    [
      '# WORKTREE — карточка дерева',
      '| Поле | Значение |',
      '|---|---|',
      '| kind | canon |',
      '| canonName | product |',
      '| Базовая ветка | main (спринт всегда в свою ветку) |',
      '| Владелец | druid |',
    ].join('\n'),
  );
  assert.deepEqual(card, { kind: 'canon', canonName: 'product', base: 'main', owner: 'druid' });
});

test('plain-формат: kind: sprint', () => {
  assert.deepEqual(parseWorktreeCard('kind: sprint'), { kind: 'sprint' });
});

test('текст без kind или с мусорным kind → null (не «почти карточка»)', () => {
  assert.equal(parseWorktreeCard('# просто readme'), null);
  assert.equal(parseWorktreeCard('| kind | навсегда |'), null);
  assert.equal(parseWorktreeCard(null), null);
  assert.equal(parseWorktreeCard(''), null);
});

test('prClosed: merged/closed = мертво, open/нет PR = живо', () => {
  assert.equal(prClosed({ number: 1, state: 'MERGED' }), true);
  assert.equal(prClosed({ number: 1, state: 'CLOSED' }), true);
  assert.equal(prClosed({ number: 1, state: 'OPEN' }), false);
  assert.equal(prClosed(null), false);
});
