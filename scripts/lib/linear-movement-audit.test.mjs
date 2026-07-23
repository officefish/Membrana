import assert from 'node:assert/strict';
import test from 'node:test';

import {
  auditMovementRecords,
  auditMovementSnapshot,
  classifyMovementRecord,
} from './linear-movement-audit.mjs';

test('classify: jump = completed без startedAt', () => {
  assert.equal(
    classifyMovementRecord({
      linearId: 'DRU-1',
      stateType: 'completed',
      startedAt: null,
      completedAt: '2026-07-20T00:00:00.000Z',
    }),
    'jump',
  );
  assert.equal(
    classifyMovementRecord({
      linearId: 'DRU-2',
      stateType: 'completed',
      completedAt: '2026-07-20T00:00:00.000Z',
    }),
    'jump',
  );
});

test('classify: moved = completed ∧ startedAt', () => {
  assert.equal(
    classifyMovementRecord({
      linearId: 'DRU-3',
      stateType: 'completed',
      startedAt: '2026-07-19T10:00:00.000Z',
      completedAt: '2026-07-20T00:00:00.000Z',
    }),
    'moved',
  );
});

test('classify: open = не completed', () => {
  assert.equal(
    classifyMovementRecord({
      linearId: 'DRU-4',
      stateType: 'started',
      startedAt: '2026-07-19T10:00:00.000Z',
      completedAt: null,
    }),
    'open',
  );
  assert.equal(
    classifyMovementRecord({
      linearId: 'DRU-5',
      stateType: 'backlog',
      startedAt: null,
      completedAt: null,
    }),
    'open',
  );
});

test('auditMovementRecords: boardIsMirrorClaim при ≥50% jump среди Done', () => {
  const audit = auditMovementRecords([
    { linearId: 'A', stateType: 'completed', startedAt: null, completedAt: 't' },
    { linearId: 'B', stateType: 'completed', startedAt: null, completedAt: 't' },
    {
      linearId: 'C',
      stateType: 'completed',
      startedAt: '2026-07-01T00:00:00.000Z',
      completedAt: 't',
    },
    { linearId: 'D', stateType: 'backlog', startedAt: null, completedAt: null },
  ]);
  assert.equal(audit.jump, 2);
  assert.equal(audit.moved, 1);
  assert.equal(audit.open, 1);
  assert.equal(audit.jumpRatioAmongDone, 2 / 3);
  assert.equal(audit.boardIsMirrorClaim, true);
  assert.deepEqual(audit.sampleJumps, ['A', 'B']);
});

test('auditMovementSnapshot: брак без records', () => {
  const bad = auditMovementSnapshot({ header: {} });
  assert.equal(bad.ok, false);
  assert.match(String(bad.problem), /records/);
});

test('auditMovementSnapshot: ок на минимальном снимке', () => {
  const ok = auditMovementSnapshot({
    header: { capturedAt: '2026-07-23T00:00:00.000Z', recordCount: 1 },
    records: [
      {
        linearId: 'DRU-9',
        stateType: 'completed',
        startedAt: null,
        completedAt: '2026-07-23T00:00:00.000Z',
      },
    ],
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.audit?.jump, 1);
  assert.equal(ok.audit?.boardIsMirrorClaim, true);
});
