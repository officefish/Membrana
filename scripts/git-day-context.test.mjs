import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeSortCap } from './lib/git-day-context.mjs';

test('dedupeSortCap: дедуп + сортировка + пустые убраны', () => {
  const r = dedupeSortCap(['b', 'a', '', ' a ', 'c'], 10);
  assert.deepEqual(r.files, ['a', 'b', 'c']);
  assert.equal(r.more, 0);
});
test('dedupeSortCap: cap + more', () => {
  const r = dedupeSortCap(['a', 'b', 'c', 'd'], 2);
  assert.deepEqual(r.files, ['a', 'b']);
  assert.equal(r.more, 2);
});
