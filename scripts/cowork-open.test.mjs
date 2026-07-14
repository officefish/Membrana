import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseCoworkOpenArgs, validateBlocks } from './cowork-open.mjs';

test('parseCoworkOpenArgs: обе формы --blocks, force', () => {
  assert.deepEqual(parseCoworkOpenArgs(['--id', 'cowork-x', '--blocks', 'capture,transport,render']), {
    sprintId: 'cowork-x',
    blocks: ['capture', 'transport', 'render'],
    force: false,
  });
  const eq = parseCoworkOpenArgs(['--id', 'cowork-x', '--blocks=a-1, b-2 ,c-3', '--force']);
  assert.deepEqual(eq.blocks, ['a-1', 'b-2', 'c-3']);
  assert.equal(eq.force, true);
});

test('validateBlocks: ровно 3, kebab-case, без дублей, без alpha/beta/gamma', () => {
  assert.equal(validateBlocks(['capture', 'transport', 'render']), null);
  assert.match(validateBlocks(['a', 'b']), /ровно 3/);
  assert.match(validateBlocks(['a', 'a', 'b']), /повторя/);
  assert.match(validateBlocks(['Cap', 'b', 'c']), /kebab-case/);
  assert.match(validateBlocks(['alpha', 'b', 'c']), /соревнования/);
});
