#!/usr/bin/env node
/**
 * yarn night-report:gate [--pull] [--today YYYY-MM-DD]
 *
 * Потребитель кадра night-report (#1293): читает носитель
 * tests/reports/nightly-summary/latest.json и исполняет blocksMorningWhen кадра.
 * --pull — сперва собрать сводку ночных workflow main (gh CLI);
 * сбой подтяжки не маскирует вердикт: гейт честно оценит локальный носитель
 * (отсутствие/несвежесть — свой блокер «ночь не отработала»).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runNightReportGate } from './lib/night-report-gate.mjs';
import { NIGHT_SUMMARY_REPORT_REL, buildNightSummaryFromGithub, readGitRevision, writeNightSummary } from './lib/night-summary.mjs';
import { NIGHTLY_FULL_REPORT_REL } from './lib/tests-nightly-full.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const NIGHTLY_WORKFLOW = 'tests-nightly-full.yml';
export const NIGHTLY_ARTIFACT = 'nightly-full-report';

/**
 * gh run download отказывается перезаписывать существующие файлы артефакта.
 * Носитель nightly-full локален и производен, поэтому перед pull чистим только
 * ожидаемые latest.* в каталоге назначения, не трогая весь каталог отчётов.
 *
 * @param {string} destDir
 * @param {string | null} carrierPath
 */
export function clearNightReportDownloadTargets(destDir, carrierPath = null) {
  const names = new Set(['latest.json', 'latest.md']);
  if (carrierPath) names.add(basename(carrierPath));
  for (const name of names) {
    rmSync(join(destDir, name), { force: true });
  }
}

/**
 * @param {string[]} argv
 */
export function parseNightReportArgs(argv) {
  const out = { pull: false, today: null, expectedRevision: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--pull') out.pull = true;
    else if (a === '--today') {
      const next = argv[++i];
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(next ?? '')) throw new Error('--today: YYYY-MM-DD');
      out.today = next;
    } else if (a === '--expected-revision') {
      const next = argv[++i];
      if (!/^[0-9a-f]{7,40}$/u.test(next ?? '')) throw new Error('--expected-revision: git SHA/prefix');
      out.expectedRevision = next;
    } else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный флаг: ${a}`);
  }
  return out;
}

/**
 * Подтянуть артефакт последнего завершённого ночного прогона main.
 * Любой сбой — слово в stderr и false; вердикт остаётся за гейтом.
 *
 * @param {string} cwd
 * @param {{ exec?: typeof execFileSync }} [deps]
 * @returns {boolean}
 */
export function pullNightReport(cwd, deps = {}) {
  const exec = deps.exec ?? execFileSync;
  let testsPullOk = true;
  try {
    const listRaw = exec(
      'gh',
      [
        'run', 'list',
        '--workflow', NIGHTLY_WORKFLOW,
        '--branch', 'main',
        '--status', 'completed',
        '--limit', '1',
        '--json', 'databaseId,conclusion,updatedAt',
      ],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const runs = JSON.parse(listRaw);
    if (!Array.isArray(runs) || runs.length === 0) {
      console.error('[night-report:pull] завершённых прогонов ночи на main нет');
      testsPullOk = false;
    } else {
      const destDir = join(cwd, dirname(NIGHTLY_FULL_REPORT_REL));
      mkdirSync(destDir, { recursive: true });
      clearNightReportDownloadTargets(destDir, NIGHTLY_FULL_REPORT_REL);
      exec('gh', ['run', 'download', String(runs[0].databaseId), '--name', NIGHTLY_ARTIFACT, '--dir', destDir], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      console.error(
        `[night-report:pull] tests-report подтянут: прогон ${runs[0].databaseId} (${runs[0].conclusion}, ${runs[0].updatedAt})`,
      );
    }
  } catch (e) {
    testsPullOk = false;
    console.error(`[night-report:pull] tests-report не подтянулся: ${e instanceof Error ? e.message : e}`);
  }

  try {
    const expectedRevision = deps.expectedRevision ?? readGitRevision(cwd, 'origin/main') ?? readGitRevision(cwd, 'HEAD');
    const summary = buildNightSummaryFromGithub({
      cwd,
      expectedRevision,
      exec,
    });
    writeNightSummary(cwd, summary);
    console.error(
      `[night-report:pull] сводка ночи записана: ${NIGHT_SUMMARY_REPORT_REL} (${summary.execution.status}, ${summary.problems.length} blockers)`,
    );
    return testsPullOk && summary.execution.status === 'pass';
  } catch (e) {
    console.error(`[night-report:pull] сводка ночи не записана: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, exec?: typeof execFileSync, log?: (s: string) => void }} [deps]
 * @returns {number}
 */
export function runNightReportCli(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  let args;
  try {
    args = parseNightReportArgs(argv);
  } catch (e) {
    console.error(`night-report:gate: ${e instanceof Error ? e.message : e}`);
    return 2;
  }
  if (args.help) {
    console.log(`Usage:
  yarn night-report:gate [--pull] [--today YYYY-MM-DD]

  Гейт ночи для утра (#1293): красный/несвежий/отсутствующий носитель = STOP (exit 2).
  --pull — сперва собрать ${NIGHT_SUMMARY_REPORT_REL}; tests-report ${NIGHTLY_ARTIFACT}/${NIGHTLY_WORKFLOW} подтягивается как детализация.
  --expected-revision SHA — тестовый/ручной target вместо origin/main.
  Дисциплина: дом носителя tests/reports/nightly-summary/ локален (gitignore), свежесть — по git revision, не по календарной дате.`);
    return 0;
  }
  if (args.pull) pullNightReport(cwd, deps);
  return runNightReportGate(cwd, {
    log: deps.log,
    today: args.today ?? undefined,
    expectedRevision: args.expectedRevision ?? undefined,
  });
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/night-report-gate.mjs')) {
  process.exitCode = runNightReportCli(process.argv.slice(2));
}
