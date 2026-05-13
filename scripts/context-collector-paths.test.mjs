import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldSkipContextPath, CONTEXT_COLLECT_IGNORE_GLOBS } from './context-collector-paths.mjs';

test('shouldSkipContextPath skips node_modules and .git', () => {
  assert.equal(shouldSkipContextPath('node_modules/foo'), true);
  assert.equal(shouldSkipContextPath('packages/x/node_modules/pkg/a.js'), true);
  assert.equal(shouldSkipContextPath('.git/config'), true);
});

test('shouldSkipContextPath skips env except .env.example', () => {
  assert.equal(shouldSkipContextPath('.env'), true);
  assert.equal(shouldSkipContextPath('apps/client/.env.local'), true);
  assert.equal(shouldSkipContextPath('.env.example'), false);
  assert.equal(shouldSkipContextPath('docs/.env.example'), false);
});

test('shouldSkipContextPath skips build artifacts', () => {
  assert.equal(shouldSkipContextPath('dist/index.js'), true);
  assert.equal(shouldSkipContextPath('apps/client/build/asset.js'), true);
  assert.equal(shouldSkipContextPath('coverage/lcov.info'), true);
});

test('CONTEXT_COLLECT_IGNORE_GLOBS documents expected entries', () => {
  const joined = CONTEXT_COLLECT_IGNORE_GLOBS.join('\n');
  assert.match(joined, /node_modules/);
  assert.match(joined, /\.git/);
  assert.match(joined, /\.env/);
});
