#!/usr/bin/env node
/**
 * yarn task:pr-land <N> — PR с реестром: локальный merge origin/main → push → merge.
 *
 * GitHub не видит merge.registry-union.driver (#1026). На CONFLICTING/DIRTY по registry
 * влить базу локально (драйвер авторешает) и сразу мержить — не править JSON руками.
 *
 * Usage:
 *   yarn task:pr-land <N>              # dry-run (план)
 *   yarn task:pr-land <N> --execute    # fetch → merge origin/main → push → pr:ship --merge-only
 *   yarn task:pr-land <N> --execute --no-wait
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parsePrLandArgs,
  planPrLand,
  prTouchesRegistry,
  readPrChangedPaths,
  readPrHeadBranch,
  REGISTRY_JSON,
  verdictFreshness,
  formatVerdictRefusal,
} from './lib/task-pr-land.mjs';
import { parseVerdict } from './lib/review-gate.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function gitHeadSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function gitCurrentBranch() {
  return execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function printUsage() {
  console.log(`Usage: yarn task:pr-land <N> [--execute] [--no-wait] [--base main]

  Для PR, трогающих ${REGISTRY_JSON}: локальный merge origin/main (union-драйвер),
  push, затем yarn pr:ship --merge-only --execute.

  По умолчанию dry-run. GitHub CONFLICTING на реестре часто ложный — не править JSON руками.
`);
}

/**
 * @param {string[]} argv
 * @returns {number}
 */
export function main(argv = process.argv.slice(2)) {
  const args = parsePrLandArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }
  if (!args.prNumber) {
    printUsage();
    return 1;
  }

  const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { cwd: repoRoot, encoding: 'utf8', ...opts });
  const prInfo = readPrHeadBranch(run, args.prNumber);
  const paths = readPrChangedPaths(run, args.prNumber);
  const touches = prTouchesRegistry(paths);
  const current = gitCurrentBranch();
  const plan = planPrLand({
    prNumber: args.prNumber,
    branch: prInfo.branch,
    currentBranch: current,
    base: args.base,
    execute: args.execute,
    wait: !args.noWait,
  });

  console.log(
    `task:pr-land${args.execute ? '' : ' [DRY-RUN]'}: PR #${args.prNumber}` +
      (prInfo.branch ? ` (${prInfo.branch})` : ''),
  );
  console.log(
    `  mergeable: ${prInfo.mergeable ?? '?'} / ${prInfo.mergeStateStatus ?? '?'} · registry: ${touches ? 'да' : 'нет'}`,
  );
  if (!touches) {
    console.warn(`  ⚠ PR не трогает ${REGISTRY_JSON} — task:pr-land всё равно вольёт base; обычно хватит rebase`);
  }
  if (plan.preflight) {
    console.log(`  · preflight: git checkout ${plan.branch}`);
    if (args.execute && plan.branch) {
      execFileSync('git', ['checkout', plan.branch], { cwd: repoRoot, stdio: 'inherit' });
    }
  }

  for (const s of plan.steps) {
    const printable = s.kind === 'gate' ? '(предикат свежести вердикта)' : `${s.cmd} ${s.args.join(' ')}`;
    if (!args.execute) {
      console.log(`  · ${s.label}: ${printable}${s.note ? `  # ${s.note}` : ''}`);
      continue;
    }
    console.log(`  → ${s.label}`);

    // Гейт свежести — не команда, а предикат: сравниваем SHA вердикта с HEAD ПОСЛЕ merge.
    if (s.kind === 'gate') {
      const headSha = gitHeadSha();
      const reviewPath = join(repoRoot, `docs/discussions/pr-${args.prNumber}-code-review.md`);
      const verdict = existsSync(reviewPath) ? parseVerdict(readFileSync(reviewPath, 'utf8')) : null;
      const fresh = verdictFreshness({ reviewedSha: verdict?.sha, headSha });
      if (!fresh.fresh) {
        console.error('');
        for (const line of formatVerdictRefusal({
          prNumber: args.prNumber,
          reviewedSha: verdict?.sha,
          headSha,
          reason: fresh.reason,
        })) {
          console.error(line);
        }
        return 1;
      }
      console.log(`     вердикт свеж: ${String(verdict.sha).slice(0, 8)} == HEAD ${headSha.slice(0, 8)}`);
      continue;
    }
    try {
      execFileSync(s.cmd, s.args, { cwd: repoRoot, stdio: 'inherit' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (s.label === 'merge-main') {
        console.error(
          `\ntask:pr-land: merge origin/${args.base} не прошёл.\n` +
            '  Если конфликт НЕ в registry — разрули вручную и повтори push + pr:ship --merge-only.\n' +
            '  Если registry — проверь yarn prepare (merge-driver) и не редактируй JSON «как на GitHub».\n',
        );
      }
      console.error(msg.split('\n')[0]);
      return 1;
    }
  }

  if (!args.execute) console.log('\n(dry-run — добавь --execute)');
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/task-pr-land.mjs')) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(`task:pr-land: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}
