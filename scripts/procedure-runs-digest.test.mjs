import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  FIVE_PILLARS,
  buildProcedureRunsDigest,
  renderProcedureRunsDigest,
} from './lib/procedure-runs-digest.mjs';
import {
  parseDigestArgs,
  readTrailWindow,
  runProcedureRunsDigest,
} from './procedure-runs-digest.mjs';

function rec(over = {}) {
  return {
    schema: 'procedure-run-journal@1',
    sequence: 1,
    at: '2026-08-10T10:00:00.000Z',
    runId: 'run-a',
    procedureId: 'ritual-day',
    status: 'pass',
    subject: 'x',
    coverage: { evidence: ['e'], gaps: [] },
    ...over,
  };
}

test('сводка: pass/fail/orphaned считаются по опорам, open не исход', () => {
  const records = [
    rec({ runId: 'r1', status: 'pass' }),
    rec({ runId: 'r1', sequence: 2, status: 'fail', runPhase: 'close', coverage: { evidence: [], gaps: ['orphaned'] } }),
    rec({ runId: 'r2', status: 'started', runPhase: 'open' }),
    rec({ runId: 's1', procedureId: 'membrana-local-sprint', status: 'blocked' }),
  ];
  const d = buildProcedureRunsDigest(records);
  const day = d.pillars.find((p) => p.procedureId === 'ritual-day');
  assert.equal(day.runs, 2);
  assert.equal(day.outcomes.pass, 1);
  assert.equal(day.outcomes.fail, 1);
  assert.equal(day.orphans, 1);
  const sprint = d.pillars.find((p) => p.procedureId === 'membrana-local-sprint');
  assert.equal(sprint.outcomes.blocked, 1);
});

test('нули: опора без записей — строка «0 прогонов», не отсутствие', () => {
  const d = buildProcedureRunsDigest([]);
  assert.equal(d.pillars.length, FIVE_PILLARS.length);
  const md = renderProcedureRunsDigest(d);
  assert.equal((md.match(/0 прогонов/gu) ?? []).length, FIVE_PILLARS.length);
});

test('трения: без root — непогашенное; амандмент с root гасит', () => {
  const records = [
    rec({
      runId: 'r1',
      friction: [
        { symptom: 'скрипт молчит', root: null, fix: null, prevention: null },
        { symptom: 'второе', root: 'найден', fix: null, prevention: null },
      ],
    }),
    rec({
      runId: 'r2',
      friction: [{ symptom: 'третье', root: null, fix: null, prevention: null }],
    }),
    // амандмент гасит r2#1[0]
    rec({
      runId: 'r2',
      sequence: 2,
      runPhase: 'friction-amend',
      amends: { runId: 'r2', sequence: 1, frictionIndex: 0 },
      root: 'дозаписан разбором',
    }),
  ];
  const d = buildProcedureRunsDigest(records);
  const day = d.pillars.find((p) => p.procedureId === 'ritual-day');
  assert.equal(day.frictionsTotal, 3);
  assert.equal(day.frictionsUnresolved, 1); // только r1[0]
});

test('окно: записи вне окна не считаются', () => {
  const records = [
    rec({ at: '2026-08-01T10:00:00.000Z', runId: 'old' }),
    rec({ at: '2026-08-10T10:00:00.000Z', runId: 'fresh' }),
  ];
  const d = buildProcedureRunsDigest(records, {
    since: '2026-08-05T00:00:00.000Z',
    until: '2026-08-11T00:00:00.000Z',
  });
  const day = d.pillars.find((p) => p.procedureId === 'ritual-day');
  assert.equal(day.runs, 1);
});

test('чужие procedureId — в others, кривой at — в problems', () => {
  const records = [
    rec({ procedureId: 'deploy-office-vds' }),
    rec({ at: 'вчера', runId: 'bad' }),
  ];
  const d = buildProcedureRunsDigest(records);
  assert.deepEqual(d.others, [{ procedureId: 'deploy-office-vds', records: 1 }]);
  assert.equal(d.problems.length, 1);
  assert.match(d.problems[0], /нечитаемый at/u);
});

test('parseDigestArgs: границы', () => {
  assert.equal(parseDigestArgs(['--days', '3']).days, 3);
  assert.deepEqual(parseDigestArgs(['--pillars', 'a, b']).pillars, ['a', 'b']);
  assert.throws(() => parseDigestArgs(['--days', '0']));
  assert.throws(() => parseDigestArgs(['--date', 'вчера']));
});

function tempTrail() {
  const root = mkdtempSync(join(tmpdir(), 'tw-digest-'));
  const dir = join(root, 'docs', 'procedure-runs', 'trail');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(root, 'docs', 'seanses'), { recursive: true });
  writeFileSync(
    join(dir, '2026-08-10.jsonl'),
    `${JSON.stringify(rec({ at: '2026-08-10T10:00:00.000Z' }))}\nне json\n`,
    'utf8',
  );
  writeFileSync(
    join(dir, '2026-08-01.jsonl'),
    `${JSON.stringify(rec({ at: '2026-08-01T10:00:00.000Z', runId: 'old' }))}\n`,
    'utf8',
  );
  return root;
}

test('readTrailWindow: файлы фильтруются по имени-дате, битые строки — в problems', () => {
  const root = tempTrail();
  const { records, problems } = readTrailWindow(root, { sinceDay: '2026-08-05', untilDay: '2026-08-11' });
  assert.equal(records.length, 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /не JSON/u);
});

test('CLI --daily: пишет датированный артефакт, exit 0', () => {
  const root = tempTrail();
  const lines = [];
  const code = runProcedureRunsDigest(['--days', '7', '--date', '2026-08-11', '--daily'], {
    cwd: root,
    log: (s) => lines.push(s),
  });
  assert.equal(code, 0);
  const artifact = join(root, 'docs', 'seanses', 'procedure-runs-digest-2026-08-11.md');
  assert.ok(existsSync(artifact));
  const md = readFileSync(artifact, 'utf8');
  assert.match(md, /ritual-day \| 1 /u);
  assert.match(md, /0 прогонов/u);
  assert.match(md, /Проблемы чтения ленты/u);
});
