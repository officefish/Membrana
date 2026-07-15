import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isBaseHeldElsewhere, planPrShip } from './pr-ship.mjs';

test('planPrShip: title + trailer + Closes + порядок шагов', () => {
  const { title, commitBody, steps } = planPrShip({
    type: 'feat',
    scope: 'core',
    message: 'добавить X',
    issue: 123,
    branch: 'feat/x',
  });
  assert.equal(title, 'feat(core): добавить X');
  assert.match(commitBody, /Closes #123/);
  assert.match(commitBody, /Co-Authored-By: Claude Opus 4\.8/);
  assert.deepEqual(
    steps.map((s) => s.label),
    ['branch', 'commit', 'push', 'pr-create', 'merge', 'sync-checkout', 'sync-fetch', 'sync-ff'],
  );
  assert.deepEqual(steps[0].args, ['checkout', '-b', 'feat/x']);
});

test('planPrShip: без scope и issue', () => {
  const { title, commitBody } = planPrShip({ type: 'fix', message: 'y' });
  assert.equal(title, 'fix: y');
  assert.doesNotMatch(commitBody, /Closes/);
});

test('planPrShip: --no-merge не добавляет merge/sync', () => {
  const { steps } = planPrShip({ type: 'chore', message: 'z', merge: false });
  assert.deepEqual(
    steps.map((s) => s.label),
    ['commit', 'push', 'pr-create'],
  );
});

test('planPrShip: требует type и message', () => {
  assert.throws(() => planPrShip({ message: 'no type' }), /type.*message/);
  assert.throws(() => planPrShip({ type: 'feat' }), /type.*message/);
});

test('planPrShip: ff-sync через origin/base, не голый pull', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x', base: 'main' });
  const ff = steps.find((s) => s.label === 'sync-ff');
  assert.deepEqual(ff.args, ['merge', '--ff-only', 'origin/main']);
});

test('planPrShip --no-commit: шаг commit пропущен, флоу начинается с push', () => {
  const { steps } = planPrShip({ type: 'fix', message: 'готовые коммиты', commit: false });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('commit'), 'commit-шага быть не должно');
  assert.equal(labels[0], 'push');
  assert.ok(labels.includes('pr-create'));
  assert.ok(labels.includes('merge'));
});

test('planPrShip --no-commit + --branch → ошибка (несовместимы)', () => {
  assert.throws(
    () => planPrShip({ type: 'fix', message: 'x', commit: false, branch: 'feat/x' }),
    /--no-commit несовместим с --branch/,
  );
});

// ─── worktree: ff-sync невозможен, если base держит соседнее дерево (#476 п.2) ─────

test('base занят другим worktree → sync-checkout не планируется', () => {
  // Живое: pr:ship падал в worktree на `git checkout main` — main держит соседняя
  // сессия. Одна ветка не может быть в двух worktree, это норма, а не ошибка.
  const { steps, skippedSync } = planPrShip({
    type: 'feat',
    message: 'x',
    worktreeBranches: ['main', 'chore/palette-clarity-setup'],
  });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('sync-checkout'), 'checkout в занятую ветку не планируем');
  assert.ok(!labels.includes('sync-ff'), 'ff-merge в чужое дерево бессмыслен');
  assert.ok(labels.includes('sync-fetch'), 'origin/main обновить всё равно нужно');
  assert.match(skippedSync, /другой worktree/);
});

test('base свободен → полный ff-sync как раньше', () => {
  const { steps, skippedSync } = planPrShip({
    type: 'feat',
    message: 'x',
    worktreeBranches: ['feat/other'],
  });
  assert.deepEqual(
    steps.map((s) => s.label),
    ['commit', 'push', 'pr-create', 'merge', 'sync-checkout', 'sync-fetch', 'sync-ff'],
  );
  assert.equal(skippedSync, undefined);
});

test('без сведений о worktree поведение прежнее (обратная совместимость)', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x' });
  assert.ok(steps.map((s) => s.label).includes('sync-checkout'));
});

test('isBaseHeldElsewhere — предикат по списку чужих веток', () => {
  assert.equal(isBaseHeldElsewhere('main', ['main']), true);
  assert.equal(isBaseHeldElsewhere('main', ['feat/x']), false);
  assert.equal(isBaseHeldElsewhere('main', []), false);
});
