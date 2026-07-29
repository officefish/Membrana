import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { BOOTSTRAP_MODES, classifyModulesLink, planWorktreeBootstrap } from './lib/worktree-bootstrap.mjs';
import { installCell } from './worktree-bootstrap.mjs';

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

/** Дерево с primary, у которого есть node_modules и .env. */
function sandbox(name) {
  const root = mkdtempSync(join(tmpdir(), name));
  const primary = join(root, 'primary');
  const wt = join(root, 'wt');
  mkdirSync(join(primary, 'node_modules'), { recursive: true });
  writeFileSync(join(primary, '.env'), 'X=1\n', 'utf8');
  mkdirSync(wt, { recursive: true });
  return { root, primary, wt };
}

test('planWorktreeBootstrap --junction: планирует link + copy .env', () => {
  const { root, primary, wt } = sandbox('wt-boot-plan-');
  try {
    const plan = planWorktreeBootstrap({ cwd: wt, primaryRoot: primary, linkEnv: true, mode: 'junction' });
    assert.equal(plan.ok, true);
    assert.ok(plan.steps.some((s) => s.action === 'modules-link'));
    assert.ok(plan.steps.some((s) => s.action === 'env-copy'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- #1465 Ф4: умолчание под канон #725 ---------------------------------------------------

test('ВЕЩДОК: умолчание — СВОЙ install, а не junction (канон #725)', () => {
  // До 29.07 инструмент раздавал junction, который канон звал анти-паттерном.
  const { root, primary, wt } = sandbox('wt-boot-install-');
  try {
    const plan = planWorktreeBootstrap({ cwd: wt, primaryRoot: primary, linkEnv: true });
    assert.equal(plan.mode, 'install');
    assert.ok(plan.steps.some((s) => s.action === 'modules-install'));
    assert.ok(!plan.steps.some((s) => s.action === 'modules-link'), 'junction по умолчанию не раздаём');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('install не зависит от primary без node_modules — junction зависел', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-boot-nosrc-'));
  try {
    const primary = join(root, 'primary');
    const wt = join(root, 'wt');
    mkdirSync(primary, { recursive: true });
    mkdirSync(wt, { recursive: true });
    assert.equal(planWorktreeBootstrap({ cwd: wt, primaryRoot: primary }).ok, true);
    assert.equal(planWorktreeBootstrap({ cwd: wt, primaryRoot: primary, mode: 'junction' }).ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('junction предупреждает про #725 и называет способ проверки', () => {
  const { root, primary, wt } = sandbox('wt-boot-warn-');
  try {
    const plan = planWorktreeBootstrap({ cwd: wt, primaryRoot: primary, mode: 'junction' });
    assert.ok(plan.warnings.some((w) => /#725/u.test(w)), 'выбор анти-паттерна обязан быть громким');
    assert.ok(plan.warnings.some((w) => /workspace:links/u.test(w)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('готовое node_modules не переустанавливается', () => {
  const { root, primary, wt } = sandbox('wt-boot-skip-');
  try {
    mkdirSync(join(wt, 'node_modules'));
    const plan = planWorktreeBootstrap({ cwd: wt, primaryRoot: primary });
    assert.ok(plan.steps.some((s) => s.action === 'modules-skip'));
    assert.ok(!plan.steps.some((s) => s.action === 'modules-install'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('карточка называет ФАКТИЧЕСКИЙ способ, а не константу «свой»', () => {
  assert.match(installCell('install'), /yarn install/u);
  assert.match(installCell('junction'), /junction/u);
  assert.match(installCell('junction'), /#725/u);
  assert.notEqual(installCell('junction'), installCell('install'));
});

test('режим вне словаря падает в канонный install, а не в junction', () => {
  const { root, primary, wt } = sandbox('wt-boot-bogus-');
  try {
    const plan = planWorktreeBootstrap({ cwd: wt, primaryRoot: primary, mode: 'нечто' });
    assert.equal(plan.mode, 'install');
    assert.ok(BOOTSTRAP_MODES.includes(plan.mode));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
