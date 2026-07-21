/**
 * Тесты worktree-sync-check (K1, ADR-0014).
 *
 * Функция решает, где разрешена авто-перемотка — тесты держат границу:
 * мутация допустима ТОЛЬКО в ff-able, всё остальное — сигнал без действия.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_THRESHOLDS,
  SYNC_CLASSES,
  canAutoFastForward,
  checkWorktreeSync,
  formatSyncLine,
} from './lib/worktree-sync-check.mjs';

const NOW = '2026-07-20T12:00:00Z';
const refs = (over = {}) => ({
  branch: 'tooling',
  behind: 0,
  ahead: 0,
  dirtyCount: 0,
  mergeBase: 'abc1234',
  mergeBaseDate: '2026-07-19T12:00:00Z',
  ...over,
});

// ─── четыре класса Р2 ─────────────────────────────────────────────────────────────

test('behind 0 → fresh', () => {
  const c = checkWorktreeSync(refs(), NOW);
  assert.equal(c.class, 'fresh');
  assert.equal(canAutoFastForward(c), false);
});

test('behind > 0, чисто, ahead 0 → ff-able (единственный класс с авто-действием)', () => {
  const c = checkWorktreeSync(refs({ behind: 3 }), NOW);
  assert.equal(c.class, 'ff-able');
  assert.equal(canAutoFastForward(c), true);
});

test('ahead > 0 → diverged, авто-мутация запрещена (даже при behind 0)', () => {
  for (const behind of [0, 5]) {
    const c = checkWorktreeSync(refs({ behind, ahead: 2 }), NOW);
    assert.equal(c.class, 'diverged');
    assert.equal(canAutoFastForward(c), false);
  }
});

test('грязное дерево → dirty, каким бы ни был behind/ahead (|writers|≤1)', () => {
  const c = checkWorktreeSync(refs({ behind: 20, ahead: 3, dirtyCount: 1 }), NOW);
  assert.equal(c.class, 'dirty');
  assert.equal(canAutoFastForward(c), false);
});

// ─── stale: пороги из конфига, danger только в отчёте ─────────────────────────────

test('behind ≥ порога → stale (дефолт 10)', () => {
  assert.equal(checkWorktreeSync(refs({ behind: 9 }), NOW).stale, false);
  assert.equal(checkWorktreeSync(refs({ behind: 10 }), NOW).stale, true);
});

test('возраст предка ≥ порога дней → stale (дефолт 7)', () => {
  const old = refs({ behind: 1, mergeBaseDate: '2026-07-12T00:00:00Z' });
  assert.equal(checkWorktreeSync(old, NOW).stale, true);
  assert.equal(checkWorktreeSync(old, NOW).ageDays, 8);
});

test('пороги переопределяются конфигом, не правкой кода (Р5)', () => {
  const c = checkWorktreeSync(refs({ behind: 3 }), NOW, { behindThreshold: 3 });
  assert.equal(c.stale, true);
  assert.deepEqual(DEFAULT_THRESHOLDS, { behindThreshold: 10, staleAgeDays: 7 });
});

// ─── детерминизм и деградация fetch ───────────────────────────────────────────────

test('время — параметр: один вход и now → бит-в-бит один выход', () => {
  const input = refs({ behind: 4 });
  assert.deepEqual(checkWorktreeSync(input, NOW), checkWorktreeSync(input, NOW));
});

test('fetch не прошёл → possiblyOutdated, класс считается по локальным refs', () => {
  const c = checkWorktreeSync(refs({ behind: 2, fetchFailed: true }), NOW);
  assert.equal(c.class, 'ff-able');
  assert.equal(c.possiblyOutdated, true);
  assert.match(formatSyncLine('tooling', c).text, /возможно неактуально/);
});

test('без даты предка ageDays = null и stale только по behind', () => {
  const c = checkWorktreeSync(refs({ behind: 1, mergeBaseDate: null }), NOW);
  assert.equal(c.ageDays, null);
  assert.equal(c.stale, false);
});

// ─── отчёт Р5: иконка+текст, семантика уровней ────────────────────────────────────

test('formatSyncLine: fresh=ok, ff-able=warn/danger, diverged несёт «+K свои → rebase»', () => {
  assert.equal(formatSyncLine('main', checkWorktreeSync(refs(), NOW)).level, 'ok');
  assert.equal(formatSyncLine('t', checkWorktreeSync(refs({ behind: 2 }), NOW)).level, 'warn');
  assert.equal(formatSyncLine('t', checkWorktreeSync(refs({ behind: 12 }), NOW)).level, 'danger');
  const div = formatSyncLine('t', checkWorktreeSync(refs({ ahead: 2, behind: 1 }), NOW));
  assert.match(div.text, /\+2 свои → rebase руками, не ff/);
});

test('словарь классов закрыт', () => {
  assert.deepEqual([...SYNC_CLASSES], ['fresh', 'ff-able', 'diverged', 'dirty']);
});
