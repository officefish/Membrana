import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { classifyModulesLink, planWorktreeBootstrap } from './lib/worktree-bootstrap.mjs';

test('classifyModulesLink: ok / missing / already', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-boot-'));
  try {
    const src = join(root, 'primary', 'node_modules');
    const wt = join(root, 'wt');
    mkdirSync(src, { recursive: true });
    mkdirSync(wt, { recursive: true });
    assert.equal(classifyModulesLink(wt, src), 'ok');
    assert.equal(classifyModulesLink(wt, join(root, 'nope')), 'missing-source');
    mkdirSync(join(wt, 'node_modules'));
    assert.equal(classifyModulesLink(wt, src), 'already');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('planWorktreeBootstrap: планирует link + copy .env', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-boot-plan-'));
  try {
    const primary = join(root, 'primary');
    const wt = join(root, 'wt');
    mkdirSync(join(primary, 'node_modules'), { recursive: true });
    writeFileSync(join(primary, '.env'), 'X=1\n', 'utf8');
    mkdirSync(wt, { recursive: true });
    const plan = planWorktreeBootstrap({ cwd: wt, primaryRoot: primary, linkEnv: true });
    assert.equal(plan.ok, true);
    assert.ok(plan.steps.some((s) => s.action === 'modules-link'));
    assert.ok(plan.steps.some((s) => s.action === 'env-copy'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
