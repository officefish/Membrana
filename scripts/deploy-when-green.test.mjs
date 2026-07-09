import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRun } from './deploy-when-green.mjs';

test('classifyRun: pending пока не completed', () => {
  assert.equal(classifyRun(null), 'pending');
  assert.equal(classifyRun({ status: 'in_progress' }), 'pending');
  assert.equal(classifyRun({ status: 'queued' }), 'pending');
});
test('classifyRun: green при success', () => {
  assert.equal(classifyRun({ status: 'completed', conclusion: 'success' }), 'green');
});
test('classifyRun: red при failure/cancelled', () => {
  assert.equal(classifyRun({ status: 'completed', conclusion: 'failure' }), 'red');
  assert.equal(classifyRun({ status: 'completed', conclusion: 'cancelled' }), 'red');
});
