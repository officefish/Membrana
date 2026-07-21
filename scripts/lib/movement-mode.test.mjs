import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertMovementPrintLegal,
  assertUnitMovementLegal,
  auditSnapshotRef,
  loadMovementMode,
  MOVEMENT_MODE_DEFERRED,
  MOVEMENT_MODE_LIVE,
} from './movement-mode.mjs';
import { SNAPSHOT_FORMAT } from './snapshot-contract.mjs';

function liveSnapshot(records = []) {
  return {
    header: {
      format: SNAPSHOT_FORMAT,
      capturedAt: '2026-07-20T08:30:00.000Z',
      sourceRevision: 'cursor-live',
      producedBy: 'media-NL',
      egressRegion: 'NL',
      mode: 'batch-full-pull',
      trigger: 'manual',
      recordCount: records.length,
    },
    records,
  };
}

test('loadMovementMode: missing file → deferred', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-'));
  const m = loadMovementMode(dir);
  assert.equal(m.movementMode, MOVEMENT_MODE_DEFERRED);
  assert.equal(m.snapshotRef, null);
});

test('assertMovementPrintLegal: stub при live → отказ', () => {
  const r = assertMovementPrintLegal(
    { movementMode: MOVEMENT_MODE_LIVE, snapshotRef: 'docs/x.json' },
    MOVEMENT_MODE_DEFERRED,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 21);
});

test('assertUnitMovementLegal: before t0 ok без ref; after t0 требует ref', () => {
  const mode = {
    movementMode: MOVEMENT_MODE_LIVE,
    switchedAt: '2026-07-20T10:00:00.000Z',
    snapshotRef: 'docs/tasks/snapshots/x.json',
  };
  assert.equal(
    assertUnitMovementLegal(mode, { createdAt: '2026-07-19T00:00:00.000Z' }).ok,
    true,
  );
  assert.equal(
    assertUnitMovementLegal(mode, { createdAt: '2026-07-20T11:00:00.000Z' }).ok,
    false,
  );
  assert.equal(
    assertUnitMovementLegal(mode, {
      createdAt: '2026-07-20T11:00:00.000Z',
      snapshotRef: 'docs/tasks/snapshots/x.json',
    }).ok,
    true,
  );
});

test('auditSnapshotRef: pullOk от файла', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-audit-'));
  const rel = 'snap.json';
  writeFileSync(join(dir, rel), JSON.stringify(liveSnapshot([])), 'utf8');
  const { ok } = auditSnapshotRef(dir, { snapshotRef: rel });
  assert.equal(ok, true);
});
