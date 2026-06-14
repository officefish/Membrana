import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CURRENT_TASK_BUFFER_REL,
  MAIN_DAY_ISSUE_REL,
  formatRegistryBlock,
  validateFocusId,
} from './lib/main-day-issue-paths.mjs';

test('paths', () => {
  assert.equal(MAIN_DAY_ISSUE_REL, 'docs/MAIN_DAY_ISSUE.md');
  assert.equal(CURRENT_TASK_BUFFER_REL, 'docs/CURRENT_TASK.md');
});

test('formatRegistryBlock', () => {
  const text = formatRegistryBlock([{ id: 'a', title: 'A', size: 'M', promptPath: 'p.md' }]);
  assert.match(text, /`a`/);
});

test('validateFocusId', () => {
  assert.equal(validateFocusId('x', [{ id: 'x' }]).ok, true);
  assert.equal(validateFocusId('y', [{ id: 'x' }]).ok, false);
});
