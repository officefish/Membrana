#!/usr/bin/env node
/**
 * worktree-sync — синхрон базовых веток рабочих деревьев с origin/main
 * (K1, ADR-0014, #717).
 *
 *   yarn worktree:sync            # fetch → предикат → авто-ff где разрешено
 *   yarn worktree:sync --dry-run  # только отчёт, без мутаций
 *
 * Правила (Р1–Р5):
 *  - событие — вход в дерево (шаг ritual:day) или явная команда; не cron, не хук;
 *  - авто-действие ровно одно: `git merge --ff-only origin/main` при классе ff-able
 *    и только в canon-дереве; diverged/dirty — сигнал владельцу, без мутации;
 *  - список деревьев — из носителя K2 (карточки WORKTREE.md), не хардкод;
 *    main-дерево исключено (identity); носителя нет → явный отказ;
 *  - находка расхождения ≠ ненулевой exit; пороги — scripts/worktree-sync.config.json.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyWorktree, parseWorktreeCard } from './lib/classify-worktree.mjs';
import {
  canAutoFastForward,
  checkWorktreeSync,
  formatSyncLine,
} from './lib/worktree-sync-check.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FETCH_TIMEOUT_MS = 30_000;

function git(args, cwd = repoRoot, opts = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', ...opts }).trim();
}

function listWorktrees() {
  const out = [];
  let current = null;
  for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) out.push(current);
      current = { path: line.slice('worktree '.length).trim(), branch: null };
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch refs/heads/', '').trim();
    }
  }
  if (current) out.push(current);
  return out;
}

function readCard(wtPath) {
  const file = join(wtPath, 'WORKTREE.md');
  if (!existsSync(file)) return null;
  try {
    return parseWorktreeCard(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function count(range) {
  try {
    return Number(git(['rev-list', '--count', range]));
  } catch {
    return 0;
  }
}

function loadThresholds() {
  try {
    return JSON.parse(readFileSync(resolve(repoRoot, 'scripts/worktree-sync.config.json'), 'utf8'));
  } catch {
    return {};
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: yarn worktree:sync [--dry-run]

Синхронизирует базовые ветки легитимных деревьев (карточка WORKTREE.md) с
origin/main. Авто — только --ff-only в canon-дереве; diverged/dirty — сигнал.
Пороги: scripts/worktree-sync.config.json. ADR-0014.`);
    return;
  }
  const dryRun = argv.includes('--dry-run');
  const thresholds = loadThresholds();
  const now = new Date();

  const trees = listWorktrees();
  const carded = trees
    .map((wt) => ({ ...wt, card: readCard(wt.path) }))
    .filter((wt) => wt.card);

  // Р4: без материализованного носителя K2 — явный отказ, не самодельный список.
  if (carded.length === 0) {
    console.error(
      'worktree-sync: носитель K2 не материализован — ни одной карточки WORKTREE.md.\n' +
        'Заведите карточки канонических деревьев (спринт worktree-hygiene-order, #717).',
    );
    process.exitCode = 1;
    return;
  }

  let fetchFailed = false;
  try {
    git(['fetch', 'origin', 'main'], repoRoot, { timeout: FETCH_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    fetchFailed = true; // деградация Р2: считаем по локальным refs с пометкой
  }

  const originMain = git(['rev-parse', '--short', 'origin/main']);
  console.log(
    `worktree-sync · origin/main ${originMain} · fetch ${fetchFailed ? 'НЕ ПРОШЁЛ' : now.toISOString()}${dryRun ? ' · dry-run' : ''}`,
  );

  // main-дерево исключено (identity); sprint-closed/unregistered — зона repo:clean.
  const scope = carded.filter((wt) => wt.card.canonName !== 'main');

  for (const wt of scope) {
    const name = wt.card.canonName ?? wt.branch ?? wt.path;
    if (!wt.branch) {
      console.log(`✋ '${name}' — detached HEAD, синхрону не подлежит (разбор вручную)`);
      continue;
    }
    const dirtyCount = existsSync(wt.path)
      ? git(['status', '--porcelain'], wt.path).split('\n').filter(Boolean).length
      : 0;
    let mergeBase = null;
    let mergeBaseDate = null;
    try {
      mergeBase = git(['merge-base', wt.branch, 'origin/main']);
      mergeBaseDate = git(['show', '-s', '--format=%cI', mergeBase]);
    } catch {
      /* нет общего предка — поля останутся null, класс посчитается по счётчикам */
    }
    const check = checkWorktreeSync(
      {
        branch: wt.branch,
        behind: count(`${wt.branch}..origin/main`),
        ahead: count(`origin/main..${wt.branch}`),
        dirtyCount,
        mergeBase,
        mergeBaseDate,
        fetchFailed,
      },
      now,
      thresholds,
    );

    const line = formatSyncLine(name, check);
    console.log(`  ${line.text}`);

    // Р3: мутация — только перемотка указателя, только canon, только ff-able.
    if (canAutoFastForward(check) && wt.card.kind === 'canon' && !dryRun) {
      const before = git(['rev-parse', '--short', wt.branch]);
      try {
        git(['merge', '--ff-only', 'origin/main'], wt.path);
        const after = git(['rev-parse', '--short', wt.branch]);
        console.log(`  ⏩ ff ${wt.branch}: ${before} → ${after}, +${check.behind}`);
      } catch (e) {
        console.log(`  ✖ ff ${wt.branch} не прошёл: ${e.message.split('\n')[0]}`);
      }
    } else if (canAutoFastForward(check) && wt.card.kind !== 'canon') {
      console.log(`    (sprint-дерево: ff руками владельцем, авто не трогаю)`);
    }
  }

  const skipped = trees.length - carded.length;
  if (skipped > 0) {
    console.log(
      `  … ${skipped} дере${skipped === 1 ? 'во' : 'вьев'} без карточки — вне синхрона (класс unregistered, зона repo:clean)`,
    );
  }
  // Находка расхождения — не сбой: exit 0 всегда, кроме отказа носителя.
}

if (process.argv[1]?.endsWith('worktree-sync.mjs')) {
  try {
    main();
  } catch (e) {
    console.error('worktree-sync ERR:', e.message);
    process.exitCode = 1;
  }
}
