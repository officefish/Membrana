import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadDotEnv, resolveDotEnvPath } from './_anthropic-env.mjs';

function withEnv(name, value, fn) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test('loadDotEnv discovers the repository .env from an isolated worktree', () => {
  const root = mkdtempSync(join(tmpdir(), 'membrana-env-root-'));
  const worktree = join(root, '.worktrees', 'issue-178-reconcile');
  mkdirSync(worktree, { recursive: true });
  writeFileSync(join(root, '.env'), 'ANTHROPIC_API_KEY=from-root\n', 'utf8');

  withEnv('MEMBRANA_ENV_PATH', undefined, () => {
    withEnv('ANTHROPIC_API_KEY', undefined, () => {
      assert.equal(resolveDotEnvPath(worktree), join(root, '.env'));
      loadDotEnv(worktree);
      assert.equal(process.env.ANTHROPIC_API_KEY, 'from-root');
    });
  });
});

test('MEMBRANA_ENV_PATH takes precedence over upward .env discovery', () => {
  const root = mkdtempSync(join(tmpdir(), 'membrana-env-explicit-'));
  const worktree = join(root, '.worktrees', 'sprint');
  const external = join(root, 'secrets', 'agent.env');
  mkdirSync(worktree, { recursive: true });
  mkdirSync(join(root, 'secrets'), { recursive: true });
  writeFileSync(join(root, '.env'), 'ANTHROPIC_API_KEY=from-root\n', 'utf8');
  writeFileSync(external, 'ANTHROPIC_API_KEY=from-explicit\n', 'utf8');

  withEnv('MEMBRANA_ENV_PATH', external, () => {
    withEnv('ANTHROPIC_API_KEY', undefined, () => {
      assert.equal(resolveDotEnvPath(worktree), external);
      loadDotEnv(worktree);
      assert.equal(process.env.ANTHROPIC_API_KEY, 'from-explicit');
    });
  });
});
