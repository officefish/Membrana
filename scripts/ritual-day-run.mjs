#!/usr/bin/env node
/**
 * ritual-day-run — утренняя цепочка с явным исходом доставки (#2081).
 *
 * Старая shell-цепочка умела только две правды: дошли до конца → close pass, оборвались →
 * ненулевой код. У `deliver-to-main --execute` появился третий честный исход: pending-ci.
 * Это хвост, а не провал ритуала и не доставка; поэтому close пишет `skipped` с named gap.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pendingCiContinuation } from './lib/ritual-deliver-to-main.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = Object.freeze([
  { id: 'ritual-artifacts', script: ['scripts/ritual-artifacts-commit.mjs', '--manifest', 'docs/tasks/morning-ritual-steps.json'], critical: false },
  { id: 'morning-care', script: ['scripts/morning-care.mjs'], critical: true },
  { id: 'infra-probe', script: ['scripts/infra-probe.mjs', '--summary'], critical: false },
  { id: 'worktree-sync', script: ['scripts/worktree-sync.mjs'], critical: false },
  { id: 'repo-clean', script: ['scripts/repo-clean.mjs'], critical: false },
  { id: 'deps-watch', script: ['scripts/deps-watch.mjs', '--mode', 'morning'], critical: false },
  { id: 'dead-wire-check', script: ['scripts/dead-wire-check.mjs'], critical: true },
  { id: 'plan-week-if-monday', script: ['scripts/plan-week-if-monday.mjs'], critical: true },
  { id: 'strategy-day', script: ['scripts/strategy-day.mjs'], critical: true },
  { id: 'day-plan', script: ['scripts/day-plan.mjs'], critical: false },
  { id: 'daily-standup', script: ['scripts/daily-standup.mjs'], critical: true },
  { id: 'main-day-probe', script: ['scripts/main-day-probe.mjs'], critical: true },
  { id: 'main-day-issue', script: ['scripts/main-day-issue.mjs'], critical: true },
  { id: 'angelina', script: ['scripts/angelina.mjs'], critical: true },
  { id: 'deliver-to-main', script: ['scripts/ritual-deliver-to-main.mjs', '--execute'], critical: true, delivery: true },
]);

function runNode(args) {
  return spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env }).status ?? 1;
}

function closeRun(status, extra = []) {
  return runNode([
    'scripts/procedure-run-record.mjs',
    'close',
    '--procedure',
    'ritual-day',
    '--status',
    status,
    '--evidence',
    'docs/MAIN_DAY_ISSUE.md',
    ...extra,
  ]);
}

export function main() {
  const open = runNode([
    'scripts/procedure-run-record.mjs',
    'open',
    '--procedure',
    'ritual-day',
    '--evidence',
    'docs/tasks/morning-ritual-steps.json',
  ]);
  if (open !== 0) return 1;

  for (const step of STEPS) {
    console.error(`\n=== ritual:day → ${step.id}${step.critical ? '' : ' (noncritical)'} ===`);
    const code = runNode(step.script);
    if (code === 0) continue;

    if (step.delivery && code === 3) {
      const tail = pendingCiContinuation({ ritual: 'day', branchHint: 'angelina/chore/ritual-day-<date>' });
      console.error(`↷ ${tail}`);
      const close = closeRun('skipped', ['--gap', 'deliver-to-main:pending-ci', '--friction', tail]);
      return close === 0 ? 0 : 1;
    }

    if (!step.critical) {
      console.error(`⊘ ${step.id}: exit ${code}, шаг некритичен — утро идёт дальше`);
      continue;
    }

    const close = closeRun('fail', ['--gap', step.id]);
    return close === 0 ? 1 : close;
  }

  const close = closeRun('pass');
  return close === 0 ? 0 : 1;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/ritual-day-run.mjs')) {
  process.exitCode = main();
}
