#!/usr/bin/env node
/**
 * ritual-day-run — утренняя цепочка с явным исходом доставки (#2081).
 *
 * Старая shell-цепочка умела только две правды: дошли до конца → close pass, оборвались →
 * ненулевой код. У `deliver-to-main --execute` появился третий честный исход: pending-ci.
 * Это хвост, а не провал ритуала и не доставка; поэтому close пишет `skipped` с named gap.
 *
 * #1782: закрытие ГАРАНТИРОВАНО. Раньше оно жило хвостом `&&`-цепочки с константой `pass`:
 * оборвалось звено — записи нет вовсе, и следующий прогон закрывал сироту лениво как `fail`,
 * вписывая в журнал провал, которого не было (вещдок 07.08). Здесь закрытие идёт через
 * `finally`: исключение внутри цепочки уносит прогон, но не запись о нём. Сборка аргументов
 * вынесена в `lib/ritual-day-close.mjs` — её судит зуб, а не глаз.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pendingCiContinuation } from './lib/ritual-deliver-to-main.mjs';
import { dayCloseArgs } from './lib/ritual-day-close.mjs';

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

let journalClosed = false;

/** Закрыть прогон по исходу. Идемпотентно: повторный вызов из finally ничего не пишет. */
function closeRun(outcome, extra = {}) {
  if (journalClosed) return 0;
  journalClosed = true;
  return runNode(['scripts/procedure-run-record.mjs', ...dayCloseArgs({ outcome, ...extra })]);
}

function runChain() {
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
      const close = closeRun('pending-ci', { tail });
      return close === 0 ? 0 : 1;
    }

    if (!step.critical) {
      console.error(`⊘ ${step.id}: exit ${code}, шаг некритичен — утро идёт дальше`);
      continue;
    }

    const close = closeRun('failed', { stepId: step.id });
    return close === 0 ? 1 : close;
  }

  const close = closeRun('pass');
  return close === 0 ? 0 : 1;
}

/**
 * #1782: что бы ни случилось внутри цепочки, запись прогона закрывается. Сирота лжёт
 * следующему прогону (он закроет её как `fail`), поэтому обрыв получает СВОЁ имя.
 */
export function main() {
  try {
    return runChain();
  } catch (e) {
    const why = String(e?.message ?? e).split('\n')[0];
    console.error(`✗ ritual:day оборвался: ${why}`);
    closeRun('aborted', { tail: `цепочка оборвана: ${why}` });
    return 1;
  } finally {
    // Ни один путь возврата не оставляет прогон открытым: closeRun идемпотентен.
    closeRun('aborted', { tail: 'цепочка завершилась без явного закрытия' });
  }
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/ritual-day-run.mjs')) {
  process.exitCode = main();
}
