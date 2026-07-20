import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertNoLinkCollision,
  normalizeLinearId,
  registerOrLinkTask,
  resolveGithubIssueAction,
  resolveLinearAttach,
} from './lib/task-start-links.mjs';

test('resolveGithubIssueAction: повторный START с карточкой → reuse, не create', () => {
  const r = resolveGithubIssueAction({
    existing: { id: 'demo', githubIssue: 739, linearId: null },
    requestedIssue: null,
    noIssue: false,
  });
  assert.equal(r.action, 'reuse');
  assert.equal(r.githubIssue, 739);
  assert.notEqual(r.action, 'create');
});

test('resolveGithubIssueAction: без карточки → create', () => {
  const r = resolveGithubIssueAction({ existing: null, noIssue: false });
  assert.equal(r.action, 'create');
});

test('resolveLinearAttach: existing linearId → create=false (anti-duplicate)', () => {
  const r = resolveLinearAttach({
    existingLinearId: 'DRU-247',
    requestedLinearId: 'DRU-999',
  });
  assert.equal(r.create, false);
  assert.equal(r.action, 'reuse');
  assert.equal(r.linearId, 'DRU-247');
});

test('resolveLinearAttach: --linear пишет attach без автосоздания', () => {
  const r = resolveLinearAttach({ existingLinearId: null, requestedLinearId: 'DRU-249' });
  assert.equal(r.action, 'attach');
  assert.equal(r.linearId, 'DRU-249');
  assert.equal(r.create, false);
});

test('assertNoLinkCollision: чужой githubIssue → throw', () => {
  const reg = {
    tasks: [{ id: 'other', githubIssue: 100, linearId: null }],
  };
  assert.throws(
    () => assertNoLinkCollision(reg, { id: 'mine', githubIssue: 100 }),
    /уже привязан/,
  );
});

test('registerOrLinkTask: upsert дописывает linearId, не плодит twin id', () => {
  const reg = {
    version: 1,
    tasks: [
      {
        id: 'demo',
        title: 'Demo',
        githubIssue: 42,
        linearId: null,
      },
    ],
  };
  const once = registerOrLinkTask(
    reg,
    { id: 'demo', githubIssue: 42, linearId: 'DRU-249' },
    'upsert-links',
  );
  assert.equal(once.action, 'upserted-links');
  assert.equal(once.entry.linearId, 'DRU-249');
  assert.equal(once.registry.tasks.length, 1);

  const twice = registerOrLinkTask(
    once.registry,
    { id: 'demo', githubIssue: 99, linearId: 'DRU-250' },
    'upsert-links',
  );
  // githubIssue уже был — не затираем; linearId уже был — не затираем
  assert.equal(twice.entry.githubIssue, 42);
  assert.equal(twice.entry.linearId, 'DRU-249');
  assert.equal(normalizeLinearId('  DRU-1  '), 'DRU-1');
});
