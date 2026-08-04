import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { DEPLOY_PROCEDURES, parseDeployRunArgs, runDeploy } from './deploy-run.mjs';
import { defaultTrailPath, readProcedureRunTrail } from './lib/procedure-run-journal.mjs';

const tempRepo = () => mkdtempSync(join(tmpdir(), 'deploy-run-'));

// Часы детерминированы, spawn — заглушка: зубы судят журнал, не ssh.
const clockFrom = (isoList) => {
  const q = [...isoList];
  return () => q.shift() ?? '2026-08-04T18:59:59.000Z';
};

test('parse: процедура из закрытого списка, --service обязателен, команда после «--»', () => {
  const p = parseDeployRunArgs(['deploy-media-vps', '--service', 'cabinet', '--', 'node', 'x.mjs']);
  assert.deepEqual(p, { procedureId: 'deploy-media-vps', service: 'cabinet', command: ['node', 'x.mjs'] });
  assert.throws(() => parseDeployRunArgs(['deploy-something', '--service', 'x', '--', 'a']), /вне закрытого списка/u);
  assert.throws(() => parseDeployRunArgs(['deploy-office-vds', '--', 'a']), /--service/u);
  assert.throws(() => parseDeployRunArgs(['deploy-office-vds', '--service', 'office']), /после «--»/u);
  assert.deepEqual(DEPLOY_PROCEDURES, ['deploy-office-vds', 'deploy-media-vps']);
});

test('runDeploy: exit 0 → open+close pass в ленте, exit-код прозрачен', () => {
  const root = tempRepo();
  const { exitCode, runId } = runDeploy(
    root,
    { procedureId: 'deploy-media-vps', service: 'cabinet', command: ['истинная-команда'] },
    { nowIso: clockFrom(['2026-08-04T18:00:00.000Z', '2026-08-04T18:05:00.000Z']), spawn: () => ({ status: 0 }) },
  );
  assert.equal(exitCode, 0);
  const records = readProcedureRunTrail(root, defaultTrailPath('2026-08-04'));
  assert.equal(records.length, 2);
  assert.equal(records[0].runPhase, 'open');
  assert.equal(records[0].runId, runId);
  assert.match(records[0].subject, /прогон cabinet @ /u);
  assert.equal(records[1].runPhase, 'close');
  assert.equal(records[1].status, 'pass');
  assert.ok(records[1].coverage.evidence.some((e) => /команда: истинная-команда/u.test(e)));
});

test('runDeploy: ненулевой exit → close fail с названным gap, код прозрачен', () => {
  const root = tempRepo();
  const { exitCode } = runDeploy(
    root,
    { procedureId: 'deploy-office-vds', service: 'office', command: ['падающая'] },
    { nowIso: clockFrom(['2026-08-04T18:00:00.000Z', '2026-08-04T18:01:00.000Z']), spawn: () => ({ status: 3 }) },
  );
  assert.equal(exitCode, 3);
  const records = readProcedureRunTrail(root, defaultTrailPath('2026-08-04'));
  assert.equal(records.at(-1).status, 'fail');
  assert.deepEqual(records.at(-1).coverage.gaps, ['exit:3']);
});

test('runDeploy: env-значения в запись не протекают — только ревизия и argv команды', () => {
  const root = tempRepo();
  process.env.DEPLOY_RUN_TEST_SECRET = 'sup3r-s3cret';
  try {
    runDeploy(
      root,
      { procedureId: 'deploy-media-vps', service: 'media', command: ['node', 'deploy.mjs'] },
      { nowIso: clockFrom(['2026-08-04T18:00:00.000Z', '2026-08-04T18:01:00.000Z']), spawn: () => ({ status: 0 }) },
    );
    const raw = JSON.stringify(readProcedureRunTrail(root, defaultTrailPath('2026-08-04')));
    assert.ok(!raw.includes('sup3r-s3cret'), 'секрет из окружения не должен попасть в журнал');
  } finally {
    delete process.env.DEPLOY_RUN_TEST_SECRET;
  }
});

test('runDeploy: обрыв без close ловится ленивым закрытием следующего прогона (#1694)', () => {
  const root = tempRepo();
  // Первый прогон «оборвался»: spawn бросает — close не пишется, open остаётся висеть.
  assert.throws(() =>
    runDeploy(
      root,
      { procedureId: 'deploy-media-vps', service: 'cabinet', command: ['умирает'] },
      { nowIso: clockFrom(['2026-08-04T18:00:00.000Z']), spawn: () => { throw new Error('обрыв процесса'); } },
    ),
  );
  const { runId } = runDeploy(
    root,
    { procedureId: 'deploy-media-vps', service: 'cabinet', command: ['вторая'] },
    { nowIso: clockFrom(['2026-08-04T18:10:00.000Z', '2026-08-04T18:11:00.000Z']), spawn: () => ({ status: 0 }) },
  );
  const records = readProcedureRunTrail(root, defaultTrailPath('2026-08-04'));
  const orphan = records.find((r) => r.runPhase === 'close' && (r.coverage.gaps ?? []).includes('orphaned'));
  assert.ok(orphan, 'сирота первого прогона закрыта лениво');
  assert.equal(orphan.orphanedBy.runId, runId);
});
