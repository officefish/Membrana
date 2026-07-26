/**
 * #1232 Ф1–Ф2 — предикаты гигиены дерева ритуала.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isClean,
  isFreshEnough,
  ritualTreeReady,
  parseWorktreeHolders,
  findBaseHolders,
  selfHoldsBase,
  baseHolderGuard,
  allowCommitOnBranch,
  DEFAULT_MAX_BEHIND,
} from './lib/ritual-tree-hygiene.mjs';

test('isClean / isFreshEnough: порог 0 по умолчанию', () => {
  assert.equal(isClean(''), true);
  assert.equal(isClean(' M file'), false);
  assert.equal(isFreshEnough(0), true);
  assert.equal(isFreshEnough(1), false);
  assert.equal(isFreshEnough(2, 3), true);
  assert.equal(DEFAULT_MAX_BEHIND, 0);
});

test('ritualTreeReady: отставание и грязь — громкие причины', () => {
  assert.equal(ritualTreeReady({ behind: 0, dirtyCount: 0 }).ok, true);

  const behind = ritualTreeReady({ behind: 3, dirtyCount: 0 });
  assert.equal(behind.ok, false);
  assert.match(behind.blockedBy[0], /отстаём.*на 3/u);

  const dirty = ritualTreeReady({
    behind: 0,
    dirtyCount: 2,
    dirtyPaths: ['a.md', 'b.ts'],
  });
  assert.equal(dirty.ok, false);
  assert.match(dirty.blockedBy[0], /грязно/u);
  assert.match(dirty.blockedBy[0], /эскалация владельцу/u);
  assert.match(dirty.blockedBy[0], /a\.md/u);
});

test('parseWorktreeHolders + findBaseHolders: имя держателя и путь', () => {
  const porcelain = [
    'worktree /Users/x/Membrana-rails',
    'HEAD abc',
    'branch refs/heads/main',
    '',
    'worktree /Users/x/Membrana-codex',
    'HEAD def',
    'branch refs/heads/feat/x',
    '',
    'worktree /Users/x/Membrana',
    'HEAD ghi',
    'detached',
    '',
  ].join('\n');
  const holders = parseWorktreeHolders(porcelain);
  assert.equal(holders.length, 3);
  assert.equal(holders[0].branch, 'main');
  assert.equal(holders[2].branch, null);

  const foreign = findBaseHolders(holders, '/Users/x/Membrana-codex', 'main');
  assert.equal(foreign.length, 1);
  assert.equal(foreign[0].path, '/Users/x/Membrana-rails');

  const guard = baseHolderGuard(foreign, { selfOnBase: false });
  assert.equal(guard.ok, false);
  assert.match(guard.findings[0], /Membrana-rails/u);
  assert.match(guard.findings[0], /находка/u);
});

test('selfHoldsBase + baseHolderGuard: main не выдаётся никому', () => {
  assert.equal(selfHoldsBase('main'), true);
  assert.equal(selfHoldsBase('feat/x'), false);
  const g = baseHolderGuard([], { selfOnBase: true });
  assert.equal(g.ok, false);
  assert.match(g.findings[0], /само на main/u);
});

test('allowCommitOnBranch: main закрыт без ALLOW', () => {
  assert.equal(allowCommitOnBranch('feat/x').ok, true);
  assert.equal(allowCommitOnBranch('main').ok, false);
  assert.equal(allowCommitOnBranch('main', { allow: true }).ok, true);
});
