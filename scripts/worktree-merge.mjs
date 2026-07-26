#!/usr/bin/env node
/**
 * yarn worktree:merge — свести ветку с базой в ОТДЕЛЬНОМ рабочем дереве (#1272 Ф3).
 *
 *   yarn worktree:merge --branch feat/x                 # план (dry-run)
 *   yarn worktree:merge --branch feat/x --execute
 *   yarn worktree:merge --branch feat/x --base origin/main --execute
 *   yarn worktree:merge --cleanup --branch feat/x       # убрать оставленное дерево
 *
 * Зачем. Общее дерево часто держат чужие незакоммиченные правки: слить базу в свою ветку
 * нельзя, переключиться нельзя, трогать чужое запрещено. Обход «ветвиться от текущей
 * точки» утаскивает чужие коммиты в базу (#1272 Ф2, поймано 26.07). Законный выход —
 * отдельное дерево; раньше его приходилось поднимать руками четырьмя командами.
 *
 * Конфликт слияния НЕ считается провалом: дерево остаётся жить для разбора.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyOutcome, planIsolatedMerge, refusalsBeforeMerge, worktreePathFor } from './lib/isolated-merge.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const branch = arg('branch');
const base = arg('base', 'origin/main');
const execute = argv.includes('--execute');
const cleanup = argv.includes('--cleanup');

const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 40e6 });
const gitQuiet = (args, cwd = ROOT) => {
  try {
    git(args, cwd);
    return true;
  } catch {
    return false;
  }
};

const path = branch ? worktreePathFor(branch, resolve(ROOT, '..')) : null;

if (cleanup) {
  if (!path) {
    console.error('worktree:merge --cleanup: нужен --branch');
    process.exit(2);
  }
  const ok = gitQuiet(['worktree', 'remove', '--force', path]);
  console.log(ok ? `[worktree:merge] дерево убрано: ${path}` : `[worktree:merge] дерева нет (уже убрано): ${path}`);
  gitQuiet(['worktree', 'prune']);
  process.exit(0);
}

const branchExists = branch
  ? gitQuiet(['rev-parse', '--verify', branch]) || gitQuiet(['rev-parse', '--verify', `origin/${branch}`])
  : false;
const checkedOutHere = branch ? git(['branch', '--show-current']).trim() === branch : false;
const refusals = refusalsBeforeMerge({ branch, base, branchExists, pathBusy: existsSync(path ?? ''), checkedOutHere });
const detach = refusals.includes('__detach__');
const hard = refusals.filter((r) => r !== '__detach__');

if (hard.length > 0) {
  for (const r of hard) console.error(`[worktree:merge] ✖ ${r}`);
  process.exit(2);
}

const steps = planIsolatedMerge({ branch, base, path, detach });

if (!execute) {
  console.log(`[worktree:merge] план (dry-run) · ветка ${branch} · база ${base}${detach ? ' · отсоединённая голова (ветка занята текущим деревом)' : ''}`);
  for (const s of steps) console.log(`  · ${s.where === 'root' ? '' : '(в новом дереве) '}git ${s.args.join(' ')}`);
  console.log('\nВыполнить: добавьте --execute');
  process.exit(0);
}

console.log(`[worktree:merge] ветка ${branch} · база ${base}${detach ? ' · отсоединённая голова' : ''}`);
let mergeOk = false;
let pushOk = false;
try {
  git(steps[0].args);
  git(steps[1].args);
  console.log(`  дерево поднято: ${path}`);
  mergeOk = gitQuiet(steps[2].args, path);
  console.log(mergeOk ? '  слияние прошло' : '  слияние дало конфликт');
  if (mergeOk) {
    pushOk = gitQuiet(steps[3].args, path);
    console.log(pushOk ? '  отправлено' : '  отправка не удалась');
  }
} catch (e) {
  console.error(`[worktree:merge] инструментальная ошибка: ${e?.message ?? e}`);
  process.exit(2);
}

const outcome = classifyOutcome({ mergeOk, pushOk, path });
if (!outcome.keepWorktree) {
  gitQuiet(steps[4].args);
  gitQuiet(['worktree', 'prune']);
}
console.log(`[worktree:merge] ${outcome.message}`);
process.exitCode = outcome.state === 'ok' ? 0 : 1;
