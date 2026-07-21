#!/usr/bin/env node
/**
 * repo:branches:decompose — 7 hygiene-категорий веток (#branch-decompose).
 *
 * Переиспользует collectInventory из repo-branches.mjs (ahead/behind/worktree).
 * Open PR heads — через `gh` (graceful degrade).
 *
 *   yarn repo:branches:decompose
 *   yarn repo:branches:decompose --no-fetch
 *   yarn repo:branches:decompose --json
 *   yarn repo:branches:decompose --report out.md
 *
 * Чистые правила — scripts/lib/repo-branches-decompose.mjs.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DECOMPOSE_HELP,
  decomposeBranches,
  parseDecomposeCli,
  renderHygieneDecompose,
} from './lib/repo-branches-decompose.mjs';
import { collectInventory } from './repo-branches.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'origin/main';

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/**
 * Open PR heads → Map<shortBranchName, {number}>.
 * Graceful: missing gh / network → empty map + note.
 */
export function fetchOpenPrByHead({ cwd = repoRoot } = {}) {
  try {
    const raw = execFileSync(
      'gh',
      ['pr', 'list', '--state', 'open', '--limit', '500', '--json', 'number,headRefName'],
      { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    const prs = JSON.parse(raw);
    /** @type {Map<string, {number: number}>} */
    const map = new Map();
    for (const pr of prs) {
      if (!pr?.headRefName) continue;
      const prev = map.get(pr.headRefName);
      if (!prev || pr.number > prev.number) {
        map.set(pr.headRefName, { number: pr.number });
      }
    }
    return { ok: true, map, note: '' };
  } catch (e) {
    const msg = String(e?.message ?? e).split(/\r?\n/)[0];
    return { ok: false, map: new Map(), note: msg };
  }
}

function main() {
  const cli = parseDecomposeCli(process.argv.slice(2));
  if (cli.help) {
    console.log(DECOMPOSE_HELP);
    return;
  }

  let fetched = false;
  if (!cli.noFetch) {
    try {
      git(['fetch', 'origin']);
      fetched = true;
    } catch (e) {
      console.error(
        `(git fetch не прошёл — decompose по локальным remote-refs: ${String(e?.message ?? e).split('\n')[0]})`,
      );
    }
  }

  try {
    git(['rev-parse', '--verify', BASE]);
  } catch {
    console.error(`repo:branches:decompose ERR: ${BASE} недоступен. Сначала: git fetch origin`);
    process.exitCode = 1;
    return;
  }

  const inventory = collectInventory({ cwd: repoRoot });
  inventory.fetched = fetched;

  const prResult = fetchOpenPrByHead({ cwd: repoRoot });
  if (!prResult.ok) {
    console.error(
      `(gh open PR недоступен — category 4 пуста, heads fall through: ${prResult.note || 'gh missing/network'})`,
    );
  }

  const decomposition = decomposeBranches(inventory, {
    openPrByHead: prResult.map,
    ghAvailable: prResult.ok,
  });

  let text;
  if (cli.json) {
    text = JSON.stringify(
      {
        base: BASE,
        currentBranch: inventory.currentBranch,
        fetched,
        ghAvailable: prResult.ok,
        ghNote: prResult.note || undefined,
        skippedRemoteTwins: decomposition.skippedRemoteTwins,
        counts: decomposition.counts,
        rows: decomposition.rows,
        byCategory: Object.fromEntries(
          Object.entries(decomposition.byCategory).map(([k, list]) => [
            k,
            list.map((r) => ({
              name: r.name,
              scope: r.scope,
              ahead: r.ahead,
              behind: r.behind,
              bucket: r.bucket,
              why: r.why,
              action: r.action,
              prNumber: r.prNumber,
              current: r.current ?? false,
              worktree: r.worktree ?? false,
            })),
          ]),
        ),
      },
      null,
      2,
    );
  } else {
    text = renderHygieneDecompose({
      base: BASE,
      currentBranch: inventory.currentBranch,
      fetched,
      ghAvailable: prResult.ok,
      ghNote: prResult.note,
      decomposition,
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

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('repo-branches-decompose.mjs') ||
    process.argv[1].endsWith('repo-branches-decompose.js'));

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error('repo:branches:decompose ERR:', e.message);
    process.exitCode = 1;
  }
}
