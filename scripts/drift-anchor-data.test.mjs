import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseArgs } from './drift-anchor-data.mjs';

test('parseArgs: дефолтный recordsDir; --records-dir переопределяет', () => {
  assert.ok(parseArgs([]).recordsDir.endsWith('records'));
  assert.ok(parseArgs(['--records-dir', 'X']).recordsDir.endsWith('X'));
});
