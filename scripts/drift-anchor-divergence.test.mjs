import assert from 'node:assert/strict';
import { test } from 'node:test';

import { exitCodeFor, parseArgs } from './drift-anchor-divergence.mjs';

test('exitCodeFor: только diverged алертит (exit 2)', () => {
  assert.equal(exitCodeFor('diverged'), 2);
  assert.equal(exitCodeFor('in-sync'), 0);
  assert.equal(exitCodeFor('stale-ci'), 0);
});

test('parseArgs: --records-dir переопределяет журнал', () => {
  assert.ok(parseArgs([]).recordsDir.endsWith('records'));
  assert.ok(parseArgs(['--records-dir', 'X']).recordsDir.endsWith('X'));
});
