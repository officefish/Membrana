import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardsToArchive } from './tasks-archive-closed.mjs';

const tasks = [
  { id: 'a', status: 'active', githubIssue: 290 },
  { id: 'b', status: 'active', githubIssue: 999 },
  { id: 'c', status: 'archived', githubIssue: 290 },
  { id: 'd', status: 'active', githubIssue: null },
];
test('только active с закрытым GH-иссью', () => {
  const r = cardsToArchive(tasks, [290, 291]);
  assert.deepEqual(r.map((t) => t.id), ['a']);
});
test('нет закрытых → пусто', () => {
  assert.deepEqual(cardsToArchive(tasks, []), []);
});
