import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/office-image-smoke.yml', import.meta.url), 'utf8');

function countPath(path) {
  return [...workflow.matchAll(new RegExp(`- '${path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}'`, 'gu'))].length;
}

test('office image smoke слушает кабинет и panel, а не только background-office (#2426)', () => {
  assert.equal(countPath('packages/background-cabinet/**'), 2);
  assert.equal(countPath('apps/panel/**'), 2);
});
