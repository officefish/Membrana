/**
 * NB2: classify/order land-reports (pure) + plan dry-run vs execute steps.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyLandReportPr,
  isAllowlistedLandPath,
  isNightTriageTitle,
  orderLandReportPrs,
  planLandReports,
} from './lib/night-land-reports.mjs';
import { parseLandReportsArgs } from './night-land-reports.mjs';

const TRIAGE_FILE = { path: 'docs/reports/night-triage/2026-07-18.md', status: 'added' };

test('isNightTriageTitle: ловит Night triage / night-triage', () => {
  assert.equal(isNightTriageTitle('Night triage: 2026-07-18'), true);
  assert.equal(isNightTriageTitle('docs(night-triage): report'), true);
  assert.equal(isNightTriageTitle('Night Build: format-v2'), false);
  assert.equal(isNightTriageTitle('feat: unrelated'), false);
});

test('isAllowlistedLandPath: только docs/reports/night-triage/**', () => {
  assert.equal(isAllowlistedLandPath('docs/reports/night-triage/x.md'), true);
  assert.equal(isAllowlistedLandPath('docs/reports/night-triage/'), false);
  assert.equal(isAllowlistedLandPath('docs/reports/other/x.md'), false);
  assert.equal(isAllowlistedLandPath('docs/reports/night-triage/../escape.md'), false);
  assert.equal(isAllowlistedLandPath('apps/client/src/x.ts'), false);
});

test('classifyLandReportPr: eligible — title + один ADDED allowlist', () => {
  const r = classifyLandReportPr({
    number: 638,
    title: 'Night triage: 2026-07-18',
    createdAt: '2026-07-18T10:00:00Z',
    isDraft: true,
    files: [TRIAGE_FILE],
  });
  assert.equal(r.eligible, true);
  assert.equal(r.reason, 'ok');
});

test('classifyLandReportPr: skip — multi-file / not-added / wrong path / title', () => {
  assert.equal(
    classifyLandReportPr({
      number: 1,
      title: 'Night triage: x',
      createdAt: '2026-07-14T00:00:00Z',
      files: [TRIAGE_FILE, { path: 'docs/reports/night-triage/y.md', status: 'added' }],
    }).reason,
    'multi-file(2)',
  );
  assert.equal(
    classifyLandReportPr({
      number: 2,
      title: 'Night triage: x',
      createdAt: '2026-07-14T00:00:00Z',
      files: [{ path: TRIAGE_FILE.path, status: 'modified' }],
    }).reason,
    'not-added:modified',
  );
  assert.equal(
    classifyLandReportPr({
      number: 3,
      title: 'Night triage: x',
      createdAt: '2026-07-14T00:00:00Z',
      files: [{ path: 'docs/NIGHT_BUILD_LOG.md', status: 'added' }],
    }).reason.startsWith('path-outside-allowlist:'),
    true,
  );
  assert.equal(
    classifyLandReportPr({
      number: 4,
      title: 'feat: code',
      createdAt: '2026-07-14T00:00:00Z',
      files: [TRIAGE_FILE],
    }).reason,
    'title-not-night-triage',
  );
  assert.equal(
    classifyLandReportPr({
      number: 5,
      title: 'Night triage: empty',
      createdAt: '2026-07-14T00:00:00Z',
      files: [],
    }).reason,
    'no-files',
  );
});

test('orderLandReportPrs: oldest-first по createdAt, затем number', () => {
  const a = classifyLandReportPr({
    number: 602,
    title: 'Night triage: 17',
    createdAt: '2026-07-17T12:00:00Z',
    files: [TRIAGE_FILE],
  });
  const b = classifyLandReportPr({
    number: 481,
    title: 'Night triage: 14',
    createdAt: '2026-07-14T12:00:00Z',
    files: [TRIAGE_FILE],
  });
  const c = classifyLandReportPr({
    number: 527,
    title: 'Night triage: 15',
    createdAt: '2026-07-15T12:00:00Z',
    files: [TRIAGE_FILE],
  });
  const ordered = orderLandReportPrs([a, b, c]);
  assert.deepEqual(ordered.map((p) => p.number), [481, 527, 602]);
});

test('planLandReports: dry-run по умолчанию; ready только для draft; порядок шагов', () => {
  const plan = planLandReports([
    {
      number: 602,
      title: 'Night triage: 17',
      createdAt: '2026-07-17T12:00:00Z',
      isDraft: false,
      files: [TRIAGE_FILE],
    },
    {
      number: 481,
      title: 'Night triage: 14',
      createdAt: '2026-07-14T12:00:00Z',
      isDraft: true,
      files: [TRIAGE_FILE],
    },
    {
      number: 99,
      title: 'feat: other',
      createdAt: '2026-07-10T12:00:00Z',
      isDraft: true,
      files: [TRIAGE_FILE],
    },
  ]);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.execute, false);
  assert.deepEqual(plan.eligible.map((p) => p.number), [481, 602]);
  assert.equal(plan.skipped.some((s) => s.number === 99), true);
  assert.deepEqual(
    plan.steps.map((s) => `${s.op}:${s.pr}`),
    ['ready:481', 'squash-merge:481', 'squash-merge:602'],
  );

  const execPlan = planLandReports(
    [
      {
        number: 481,
        title: 'Night triage: 14',
        createdAt: '2026-07-14T12:00:00Z',
        isDraft: true,
        files: [TRIAGE_FILE],
      },
    ],
    { execute: true },
  );
  assert.equal(execPlan.dryRun, false);
  assert.equal(execPlan.execute, true);
});

test('parseLandReportsArgs: --execute', () => {
  assert.deepEqual(parseLandReportsArgs([]), { execute: false });
  assert.deepEqual(parseLandReportsArgs(['--execute']), { execute: true });
});
