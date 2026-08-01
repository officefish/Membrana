import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  buildProcedureRunRecord,
  appendProcedureRunRecord,
  readProcedureRunTrail,
  summarizeProcedureRunTrail,
  validateProcedureRunRecord,
} from './lib/procedure-run-journal.mjs';

function tempRepo() {
  return mkdtempSync(join(tmpdir(), 'procedure-run-journal-'));
}

test('builds a pass record with evidence and stable ledger leaf', () => {
  const record = buildProcedureRunRecord(
    {
      procedureId: 'ritual-evening',
      runId: 'ritual-evening-2026-08-01',
      status: 'pass',
      subject: 'evening delivery frame covered generated artifacts',
      evidence: ['docs/archive/daily-day/2026-07-31/audit.md'],
    },
    { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
  );
  assert.equal(record.schema, 'procedure-run-journal@1');
  assert.match(record.ledger.leafHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateProcedureRunRecord(record), []);
});

test('pass without evidence is rejected', () => {
  assert.throws(
    () =>
      buildProcedureRunRecord(
        {
          procedureId: 'code-review',
          runId: 'code-review-2026-08-01',
          status: 'pass',
          subject: 'review covered the day',
        },
        { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
      ),
    /pass record must name at least one evidence item/,
  );
});

test('blocked record can carry a named gap', () => {
  const record = buildProcedureRunRecord(
    {
      procedureId: 'ritual-evening',
      runId: 'delivery-frame-2026-08-01',
      status: 'blocked',
      subject: 'deliver handoff to neighbors',
      gaps: ['bridge digest missing for a day without bridge'],
    },
    { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
  );
  assert.deepEqual(validateProcedureRunRecord(record), []);
  assert.equal(record.coverage.gaps[0], 'bridge digest missing for a day without bridge');
});

test('append and read JSONL trail', () => {
  const root = tempRepo();
  try {
    const trail = 'docs/procedure-runs/trail/2026-08-01.jsonl';
    const one = buildProcedureRunRecord(
      {
        procedureId: 'membrana-local-sprint',
        runId: 'procedure-run-journal-f1',
        status: 'pass',
        subject: 'OPEN and registry frame exist',
        evidence: ['docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md'],
      },
      { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
    );
    appendProcedureRunRecord(root, trail, one);
    const text = readFileSync(join(root, trail), 'utf8');
    assert.equal(text.split('\n').filter(Boolean).length, 1);
    assert.deepEqual(readProcedureRunTrail(root, trail), [one]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('summary names gaps instead of hiding behind counts', () => {
  const records = [
    buildProcedureRunRecord(
      {
        procedureId: 'procedure-x',
        runId: 'run-1',
        status: 'blocked',
        subject: 'cover subject',
        gaps: ['missing artifact'],
      },
      { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
    ),
  ];
  const summary = summarizeProcedureRunTrail(records);
  assert.equal(summary.blocked, 1);
  assert.deepEqual(summary.gaps, [{ procedureId: 'procedure-x', runId: 'run-1', gap: 'missing artifact' }]);
});

test('summary rejects unreadable input instead of inventing counters', () => {
  assert.throws(() => summarizeProcedureRunTrail(null), /records must be an array/);
  assert.throws(() => summarizeProcedureRunTrail([{ status: 'unknown', coverage: { gaps: [] } }]), /records\[0\]\.status/);
  assert.throws(() => summarizeProcedureRunTrail([{ status: 'pass', coverage: { gaps: 'oops' } }]), /coverage\.gaps/);
});
