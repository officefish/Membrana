#!/usr/bin/env node
/**
 * repo:branches — инвентарь локальных и origin/* веток vs origin/main (#branch-audit).
 *
 * Таблицы: ahead/behind + бакеты sync / ahead-only / behind-only / diverged.
 * Worktree-занятые и текущая ветка помечены колонками. Не использует
 * `git branch --merged` (squash врёт — #492).
 *
 *   yarn repo:branches                 # fetch + markdown tables
 *   yarn repo:branches --no-fetch      # без сети
 *   yarn repo:branches --json
 *   yarn repo:branches --report out.md
 *
 * Чистые правила — scripts/lib/repo-branches.mjs.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HELP,
  classifyBucket,
  isOriginTrackingRef,
  parseCli,
  renderBranchAudit,
  summarizeBuckets,
} from './lib/repo-branches.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'origin/main';

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function gitLines(args, cwd = repoRoot) {
  const out = git(args, cwd);
  return out ? out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
}

/** Ветки, занятые worktree (локальные имена без refs/heads/). */
export function worktreeBranches(porcelainText) {
  const branches = new Set();
  for (const line of String(porcelainText ?? '').split(/\r?\n/)) {
    if (line.startsWith('branch ')) {
      branches.add(line.replace('branch refs/heads/', '').trim());
    }
  }
  return branches;
}

function aheadBehind(ref, cwd = repoRoot) {
  try {
    const ahead = Number(git(['rev-list', '--count', `${BASE}..${ref}`], cwd)) || 0;
    const behind = Number(git(['rev-list', '--count', `${ref}..${BASE}`], cwd)) || 0;
    return { ahead, behind };
  } catch {
    return { ahead: 0, behind: 0, error: true };
  }
}

/**
 * Собрать срез (тестируется косвенно через render; I/O здесь).
 */
export function collectInventory({ cwd = repoRoot } = {}) {
  const currentBranch = (() => {
    try {
      return git(['branch', '--show-current'], cwd);
    } catch {
      return '';
    }
  })();

  let wtSet = new Set();
  try {
    wtSet = worktreeBranches(git(['worktree', 'list', '--porcelain'], cwd));
  } catch {
    wtSet = new Set();
  }

  const locals = gitLines(['for-each-ref', 'refs/heads', '--format=%(refname:short)'], cwd);
  const local = locals.map((name) => {
    const { ahead, behind } = aheadBehind(name, cwd);
    return {
      name,
      ahead,
      behind,
      bucket: classifyBucket(ahead, behind),
      current: name === currentBranch,
      worktree: wtSet.has(name),
    };
  });

  // Remote refs: origin/<name> only (see isOriginTrackingRef). Keep origin/main.
  const remotes = gitLines(
    ['for-each-ref', 'refs/remotes/origin', '--format=%(refname:short)'],
    cwd,
  ).filter(isOriginTrackingRef);

  const remote = remotes.map((full) => {
    const short = full.replace(/^origin\//, '');
    const { ahead, behind } = aheadBehind(full, cwd);
    return {
      name: full,
      ahead,
      behind,
      bucket: classifyBucket(ahead, behind),
      worktree: wtSet.has(short),
    };
  });

  return {
    base: BASE,
    currentBranch,
    local,
    remote,
    buckets: {
      local: summarizeBuckets(local),
      remote: summarizeBuckets(remote),
    },
  };
}

function main() {
  const cli = parseCli(process.argv.slice(2));
  if (cli.help) {
    console.log(HELP);
    return;
  }

  let fetched = false;
  if (!cli.noFetch) {
    try {
      git(['fetch', 'origin']);
      fetched = true;
    } catch (e) {
      console.error(`(git fetch не прошёл — inventory по локальным remote-refs: ${String(e?.message ?? e).split('\n')[0]})`);
    }
  }

  try {
    // Sanity: base must resolve
    git(['rev-parse', '--verify', BASE]);
  } catch {
    console.error(`repo:branches ERR: ${BASE} недоступен. Сначала: git fetch origin`);
    process.exitCode = 1;
    return;
  }

  const inventory = collectInventory();
  inventory.fetched = fetched;

  let text;
  if (cli.json) {
    text = JSON.stringify(inventory, null, 2);
  } else {
    text = renderBranchAudit({
      base: inventory.base,
      currentBranch: inventory.currentBranch,
      fetched,
      local: inventory.local,
      remote: inventory.remote,
    });
  }

  console.log(text);

  if (cli.report) {
    try {
      writeFileSync(resolve(process.cwd(), cli.report), `${text}\n`, 'utf8');
      console.error(`\nОтчёт: ${cli.report}`);
    } catch (e) {
      console.error(`\nОтчёт не записан (${cli.report}): ${e.message}`);
      process.exitCode = 1;
    }
  }
}

if (process.argv[1]?.endsWith('repo-branches.mjs')) {
  try {
    main();
  } catch (e) {
    console.error('repo:branches ERR:', e.message);
    process.exitCode = 1;
  }
}
