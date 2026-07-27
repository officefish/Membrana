import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { auditKit } from './kit-subgraph-audit.mjs';
import { formatSetupReport, loadTestCatalog, selectTestSetup } from './tests-container.mjs';

export const NIGHTLY_FULL_REPORT_REL = 'tests/reports/nightly-full/latest.json';
export const NIGHTLY_FULL_MARKDOWN_REL = 'tests/reports/nightly-full/latest.md';

export function buildNightlyFullReport({ repoRoot, generatedAt = new Date().toISOString(), dryRun = false } = {}) {
  const catalog = loadTestCatalog(repoRoot);
  const setup = selectTestSetup({ repoRoot, setup: 'full', catalog });
  const kit = auditKit({ repoRoot, kitDir: join(repoRoot, 'kits/tests-master'), mode: 'pinned' });
  const problems = [...setup.problems, ...kit.findings.filter((f) => f.blocking).map((f) => `kit:${f.kind}:${f.path}:${f.detail}`)];
  return {
    schemaVersion: 1,
    generatedAt,
    issue: 1293,
    carrier: {
      procedure: 'ritual-day',
      frame: 'night-report',
      path: NIGHTLY_FULL_REPORT_REL,
      command: 'node scripts/tests-nightly-full.mjs',
    },
    kit: {
      id: 'tests-master',
      mode: 'pinned',
      ok: kit.ok,
      manifest: 'kits/tests-master/MANIFEST.json',
      findings: kit.findings,
      pinCount: kit.pinCount,
      actualCount: kit.actualCount,
    },
    setup: {
      name: setup.setup,
      total: setup.total,
      run: setup.run,
      notRun: setup.notRun,
      skipped: setup.skipped,
      changedFiles: setup.changedFiles,
      problems: setup.problems,
      text: formatSetupReport(setup),
    },
    execution: {
      dryRun,
      attempted: false,
      status: problems.length ? 'blocked' : 'planned',
      exitCode: null,
    },
    problems,
  };
}

export function runNightlyFull({ repoRoot, dryRun = false } = {}) {
  const report = buildNightlyFullReport({ repoRoot, dryRun });
  if (report.problems.length > 0 || dryRun) return report;
  const run = spawnSync(process.execPath, ['--test', ...report.setup.run], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  report.execution.attempted = true;
  report.execution.exitCode = run.status ?? 1;
  report.execution.status = report.execution.exitCode === 0 ? 'pass' : 'fail';
  return report;
}

export function renderNightlyFullMarkdown(report) {
  const lines = [
    '# Tests nightly full',
    '',
    `Generated: ${report.generatedAt}`,
    `Carrier: ${report.carrier.procedure}/${report.carrier.frame} -> ${report.carrier.path}`,
    `Kit: ${report.kit.id} (${report.kit.mode}) ${report.kit.ok ? 'ok' : 'blocked'}`,
    `Execution: ${report.execution.status}${report.execution.exitCode == null ? '' : ` (exit ${report.execution.exitCode})`}`,
    '',
    '## Setup',
    '',
    '```text',
    report.setup.text,
    '```',
    '',
    '## What Did Not Run',
    '',
  ];
  if (report.setup.notRun.length === 0) lines.push('0 files. Full setup covered every catalog-discovered test.');
  else for (const file of report.setup.notRun) lines.push(`- ${file}`);
  if (report.setup.skipped.length > 0) {
    lines.push('', '## Skipped', '');
    for (const item of report.setup.skipped) lines.push(`- ${item.file}: ${item.reason}`);
  }
  if (report.problems.length > 0) {
    lines.push('', '## Problems', '');
    for (const problem of report.problems) lines.push(`- ${problem}`);
  }
  return `${lines.join('\n')}\n`;
}

export function writeNightlyFullReport(repoRoot, report) {
  const jsonPath = join(repoRoot, NIGHTLY_FULL_REPORT_REL);
  const mdPath = join(repoRoot, NIGHTLY_FULL_MARKDOWN_REL);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(mdPath, renderNightlyFullMarkdown(report), 'utf8');
  return { jsonPath, mdPath };
}
