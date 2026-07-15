#!/usr/bin/env node
/**
 * repo-clean — убрать мёртвые ветки и worktree (#492).
 *
 * Классификация ТОЛЬКО по состоянию PR на GitHub: репозиторий мёржит squash,
 * поэтому `git branch --merged` слеп (замер 2026-07-15 — видит 9 влитых из 42
 * реально мёртвых). Правила и гарды — в lib/repo-clean.mjs, здесь I/O и отчёт.
 *
 *   yarn repo:clean                 # dry-run: только отчёт, ничего не трогает
 *   yarn repo:clean --execute       # удалить локальные ветки
 *   yarn repo:clean --execute --remote     # + удалить ветки на origin
 *   yarn repo:clean --execute --worktrees  # + убрать worktree архивных спринтов
 *
 * Ничего не удаляется молча: всё пропущенное печатается с причиной.
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  decideBranch,
  decideWorktree,
  groupByReason,
  latestPrByBranch,
  makeArchivedSprintPredicate,
} from './lib/repo-clean.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'officefish/Membrana';

export function parseCli(argv) {
  return {
    execute: argv.includes('--execute'),
    remote: argv.includes('--remote'),
    worktrees: argv.includes('--worktrees'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function gitLines(args, cwd = repoRoot) {
  return git(args, cwd).split('\n').map((s) => s.trim()).filter(Boolean);
}

function fetchPrs() {
  const raw = execSync(
    `gh pr list --state all --limit 500 --json number,state,headRefName --repo ${REPO}`,
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(raw);
}

/** Ветки, занятые worktree: удалить их git всё равно не даст, но причина должна быть внятной. */
function worktreeBranches() {
  const branches = new Set();
  for (const line of gitLines(['worktree', 'list', '--porcelain'])) {
    if (line.startsWith('branch ')) branches.add(line.replace('branch refs/heads/', '').trim());
  }
  return branches;
}

function listWorktrees() {
  const out = [];
  let current = null;
  for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) out.push(current);
      current = { path: line.slice('worktree '.length).trim(), branch: null, locked: false };
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch refs/heads/', '').trim();
    } else if (line.startsWith('locked')) {
      current.locked = true;
    }
  }
  if (current) out.push(current);
  return out;
}

function hasRemoteBranch(remoteSet, name) {
  return remoteSet.has(name);
}

function aheadOfMain(branch) {
  try {
    return Number(git(['rev-list', '--count', `origin/main..${branch}`]));
  } catch {
    return 0;
  }
}

function report(title, groups) {
  console.log(`\n${title}`);
  if (groups.size === 0) {
    console.log('  —');
    return;
  }
  for (const [reason, names] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${names.length.toString().padStart(3)} · ${reason}`);
    if (names.length <= 12) for (const n of names) console.log(`        ${n}`);
  }
}

function main() {
  const cli = parseCli(process.argv.slice(2));
  if (cli.help) {
    console.log(`Usage: yarn repo:clean [--execute] [--remote] [--worktrees]

  По умолчанию — dry-run: печатает решения и НИЧЕГО не трогает.
  --execute     удалить локальные мёртвые ветки
  --remote      вместе с --execute: удалить их и на origin
  --worktrees   вместе с --execute: убрать worktree архивных спринтов

  Мертва = ветка с PR в состоянии MERGED или CLOSED. Всё остальное
  (открытый PR, нет PR, персона-ветка, занята worktree) — остаётся.`);
    return;
  }

  console.log('repo-clean · источник истины — состояние PR (squash-мёрж делает git branch --merged слепым)');
  const prs = fetchPrs();
  const prByBranch = latestPrByBranch(prs);
  const currentBranch = git(['branch', '--show-current']);
  const wtBranches = worktreeBranches();
  const registry = JSON.parse(readFileSync(resolve(repoRoot, 'docs/tasks/registry.json'), 'utf8'));
  const isArchivedSprint = makeArchivedSprintPredicate(registry);

  const remoteSet = new Set(
    gitLines(['branch', '-r', '--format=%(refname:short)'])
      .filter((b) => b && !b.includes('HEAD'))
      .map((b) => b.replace(/^origin\//, '')),
  );

  console.log(`PR: ${prs.length} · ветка сессии: ${currentBranch} · worktree занимают ${wtBranches.size} веток`);

  // ─── локальные ветки ────────────────────────────────────────────────────────────
  const locals = gitLines(['branch', '--format=%(refname:short)']);
  const localDecisions = locals.map((name) =>
    decideBranch(
      { name, hasRemote: hasRemoteBranch(remoteSet, name), aheadOfMain: aheadOfMain(name) },
      prByBranch,
      { worktreeBranches: wtBranches, currentBranch },
    ),
  );
  const localDead = localDecisions.filter((d) => d.delete);
  report(`Локальные ветки (${locals.length}) — УДАЛИТЬ ${localDead.length}:`, groupByReason(localDead));
  report('Локальные — оставить:', groupByReason(localDecisions.filter((d) => !d.delete)));

  // ─── удалённые ветки ────────────────────────────────────────────────────────────
  const remotes = [...remoteSet].filter((b) => b !== 'main');
  const remoteDecisions = remotes.map((name) =>
    decideBranch({ name, hasRemote: true, aheadOfMain: 0 }, prByBranch, {
      worktreeBranches: wtBranches,
      currentBranch,
    }),
  );
  const remoteDead = remoteDecisions.filter((d) => d.delete);
  report(`Удалённые ветки (${remotes.length}) — УДАЛИТЬ ${remoteDead.length}:`, groupByReason(remoteDead));
  report('Удалённые — оставить:', groupByReason(remoteDecisions.filter((d) => !d.delete)));

  // ─── worktree ───────────────────────────────────────────────────────────────────
  const wts = listWorktrees().map((wt, index) => {
    const dirtyCount = existsSync(wt.path)
      ? gitLines(['status', '--porcelain'], wt.path).length
      : 0;
    return decideWorktree(
      {
        ...wt,
        isMain: index === 0,
        isCurrent: resolve(wt.path) === resolve(repoRoot),
        dirtyCount,
      },
      isArchivedSprint,
    );
  });
  const wtDead = wts.filter((w) => w.remove);
  report(`Worktree (${wts.length}) — УБРАТЬ ${wtDead.length}:`, groupByReason(wtDead));
  report('Worktree — оставить:', groupByReason(wts.filter((w) => !w.remove)));

  if (!cli.execute) {
    console.log('\ndry-run: ничего не тронуто. Реально удалить — --execute [--remote] [--worktrees].');
    return;
  }

  // ─── исполнение ─────────────────────────────────────────────────────────────────
  let removed = 0;
  let failed = 0;

  if (cli.worktrees) {
    for (const w of wtDead) {
      try {
        git(['worktree', 'remove', w.path]);
        console.log(`  worktree removed: ${w.path}`);
        removed++;
      } catch (e) {
        console.error(`  worktree FAIL ${w.path}: ${e.message.split('\n')[0]}`);
        failed++;
      }
    }
    git(['worktree', 'prune']);
  }

  for (const d of localDead) {
    try {
      // -D, а не -d: при squash-мёрже git не считает ветку влитой и -d откажет.
      // Право на удаление даёт состояние PR, а не git-предки.
      git(['branch', '-D', d.name]);
      console.log(`  local deleted: ${d.name} (${d.reason})`);
      removed++;
    } catch (e) {
      console.error(`  local FAIL ${d.name}: ${e.message.split('\n')[0]}`);
      failed++;
    }
  }

  if (cli.remote) {
    for (const d of remoteDead) {
      try {
        git(['push', 'origin', '--delete', d.name]);
        console.log(`  remote deleted: ${d.name} (${d.reason})`);
        removed++;
      } catch (e) {
        console.error(`  remote FAIL ${d.name}: ${e.message.split('\n')[0]}`);
        failed++;
      }
    }
  }

  console.log(`\nГотово: убрано ${removed}, ошибок ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

// Гард запуска: без него импорт из теста полез бы в gh и git.
if (process.argv[1]?.endsWith('repo-clean.mjs')) {
  try {
    main();
  } catch (e) {
    console.error('repo-clean ERR:', e.message);
    process.exitCode = 1;
  }
}
