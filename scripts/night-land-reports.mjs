#!/usr/bin/env node
/**
 * yarn night:land-reports — утренний каскад night-triage docs-report PR.
 *
 * По умолчанию dry-run (ничего не мёржит). `--execute` → gh pr ready + squash-merge
 * oldest-first для eligible: title~Night triage, ровно один ADDED файл под
 * docs/reports/night-triage/**.
 *
 * Usage:
 *   yarn night:land-reports
 *   yarn night:land-reports --execute
 */
import { execFileSync } from 'node:child_process';

import {
  isNightTriageTitle,
  planLandReports,
} from './lib/night-land-reports.mjs';

/**
 * @param {string[]} argv
 */
export function parseLandReportsArgs(argv) {
  return { execute: argv.includes('--execute') };
}

/**
 * @param {(cmd: string, args: string[], opts?: object) => string} run
 * @returns {Array<{number: number, title: string, createdAt: string, isDraft: boolean}>}
 */
export function listOpenPrs(run = execFileSync) {
  const raw = run(
    'gh',
    ['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,createdAt,isDraft'],
    { encoding: 'utf8' },
  );
  return JSON.parse(raw);
}

/**
 * Файлы PR со status (added/modified/…).
 * @param {number} prNumber
 * @param {(cmd: string, args: string[], opts?: object) => string} run
 * @returns {Array<{path: string, status: string}>}
 */
export function fetchPrFiles(prNumber, run = execFileSync) {
  const raw = run(
    'gh',
    [
      'api',
      `repos/{owner}/{repo}/pulls/${prNumber}/files`,
      '--jq',
      '[.[] | {path: .filename, status: .status}]',
    ],
    { encoding: 'utf8' },
  );
  return JSON.parse(raw);
}

/**
 * Собрать LandPrInput[]: title-filter сначала (дешевле), затем files для кандидатов.
 * @param {(cmd: string, args: string[], opts?: object) => string} [run]
 */
export function collectLandCandidates(run = execFileSync) {
  const open = listOpenPrs(run);
  /** @type {import('./lib/night-land-reports.mjs').LandPrInput[]} */
  const out = [];
  for (const pr of open) {
    // Только title~Night triage; остальные open PR не трогаем (иначе шум в skipped).
    if (!isNightTriageTitle(pr.title)) continue;
    const files = fetchPrFiles(pr.number, run);
    out.push({
      number: pr.number,
      title: pr.title,
      createdAt: pr.createdAt,
      isDraft: pr.isDraft,
      files,
    });
  }
  return out;
}

/**
 * @param {{ execute: boolean }} opts
 * @param {(cmd: string, args: string[], opts?: object) => string} [run]
 * @param {{ log?: (s: string) => void, err?: (s: string) => void }} [io]
 */
export function runLandReports(opts, run = execFileSync, io = {}) {
  const log = io.log ?? ((s) => console.log(s));
  const candidates = collectLandCandidates(run);
  const plan = planLandReports(candidates, { execute: opts.execute });

  const mode = plan.dryRun ? 'DRY-RUN' : 'EXECUTE';
  log(`night:land-reports [${mode}]`);
  log(`  candidates (Night triage title): ${candidates.length}`);
  log(`  eligible: ${plan.eligible.length}`);
  log(`  skipped:  ${plan.skipped.length}`);

  for (const s of plan.skipped) {
    log(`  skip  #${s.number} — ${s.reason} — ${s.title}`);
  }
  for (const e of plan.eligible) {
    const draft = e.isDraft ? ' draft' : '';
    log(`  land  #${e.number}${draft} — ${e.createdAt} — ${e.title}`);
    for (const f of e.files) log(`         ${f.status} ${f.path}`);
  }

  if (plan.steps.length === 0) {
    log('Нет eligible PR для land-каскада.');
    return { plan, merged: [] };
  }

  if (plan.dryRun) {
    log('\nПлан шагов (ничего не сделано):');
    for (const step of plan.steps) {
      log(`  [${step.op}] #${step.pr} — ${step.note}`);
    }
    log('\nВыполнить: yarn night:land-reports --execute');
    return { plan, merged: [] };
  }

  /** @type {number[]} */
  const merged = [];
  for (const step of plan.steps) {
    if (step.op === 'ready') {
      log(`→ gh pr ready ${step.pr}`);
      run('gh', ['pr', 'ready', String(step.pr)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } else if (step.op === 'squash-merge') {
      log(`→ gh pr merge ${step.pr} --squash --delete-branch`);
      run(
        'gh',
        ['pr', 'merge', String(step.pr), '--squash', '--delete-branch'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      merged.push(step.pr);
    }
  }
  log(`\nСмёржено: ${merged.length ? merged.map((n) => `#${n}`).join(', ') : '—'}`);
  return { plan, merged };
}

function main() {
  const opts = parseLandReportsArgs(process.argv.slice(2));
  try {
    runLandReports(opts);
  } catch (e) {
    console.error(String(e instanceof Error ? e.message : e));
    process.exitCode = 1;
  }
}

const isDirect = process.argv[1] && /night-land-reports\.mjs$/i.test(process.argv[1].replace(/\\/g, '/'));
if (isDirect) main();
