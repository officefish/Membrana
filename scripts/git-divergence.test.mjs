import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isValidBranchName } from './git-fresh-branch.mjs';
import { classifyDivergence } from './git-check-divergence.mjs';

describe('classifyDivergence', () => {
  it('равные SHA → in-sync', () => {
    assert.equal(classifyDivergence('a', 'a', 'a'), 'in-sync');
  });
  it('локальный = merge-base (предок origin) → behind', () => {
    assert.equal(classifyDivergence('L', 'O', 'L'), 'behind');
  });
  it('origin = merge-base (локальный впереди) → ahead (риск чужого коммита)', () => {
    assert.equal(classifyDivergence('L', 'O', 'O'), 'ahead');
  });
  it('обе стороны уникальны → diverged', () => {
    assert.equal(classifyDivergence('L', 'O', 'B'), 'diverged');
  });
});

describe('isValidBranchName', () => {
  it('валидные', () => {
    for (const n of ['feat/x', 'chore/evening-2026-07-12', 'a', 'DA4_core']) {
      assert.ok(isValidBranchName(n), n);
    }
  });
  it('невалидные (пробел, дефис-в-начале, .., пусто, не строка)', () => {
    for (const n of ['a b', '-x', 'a..b', '', '/x', undefined, 42]) {
      assert.equal(isValidBranchName(n), false, String(n));
    }
  });
});
