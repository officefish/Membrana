import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const SEED = readFileSync(new URL('./seed.mjs', import.meta.url), 'utf8');

test('seed delegates tariff rows to grid projection, not tariff-scalars', () => {
  assert.match(SEED, /tariff-project-cabinet\.mjs/u);
  assert.doesNotMatch(SEED, /tariff-scalars\.mjs/u);
  assert.doesNotMatch(SEED, /FREE_TARIFF_ID/u);
  assert.doesNotMatch(SEED, /userStorageQuotaBytes:\s*\d/u);
});
