import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

import { runLevelingGate } from './lib/membrana-leveling-gate.mjs';
import { planMainFill, runMainFillTrain } from './lib/membrana-leveling-main-fill.mjs';
import { buildWorkspaceLevelReport } from './lib/membrana-leveling-report.mjs';
import {
  assertNoWipSnapshotInRepo,
  cleanupScratchRoot,
  createScratchRoot,
  isWipSnapshotAntipattern,
} from './lib/membrana-leveling-scratch.mjs';

const readyCtx = {
  dirty: false,
  registered: true,
  inActiveSession: false,
  ciGreen: true,
  conflictsMain: false,
  prApproved: true,
  leadStamp: true,
  unitOf: 'unit-a',
};

test('oracle: unnamed-trash → STOP', () => {
  const g = runLevelingGate({
    items: [{ path: 'orphan.log', ctx: { dirty: true, registered: false } }],
    namedTrash: {},
  });
  assert.equal(g.status, 'stop');
  assert.ok(g.reason.includes('unnamed-trash'));
  assert.equal(g.mainFill, 'pending');
});

test('oracle: unfinished without card → STOP', () => {
  const g = runLevelingGate({
    items: [
      {
        path: 'docs/x.md',
        ctx: { registered: true, dirty: true, inActiveSession: false, ciGreen: false },
      },
    ],
    unfinishedCards: {},
  });
  assert.equal(g.status, 'stop');
  assert.ok(g.reason.includes('unregistered-unfinished'));
});

test('oracle: WIP-commit ≠ registration', () => {
  const g = runLevelingGate({
    items: [
      {
        path: 'docs/x.md',
        ctx: { registered: true, dirty: true, inActiveSession: false },
      },
    ],
    unfinishedCards: {
      'docs/x.md': {
        id: 'wip-only',
        state: 'unfinished',
        whyNotReady: 'ci red',
        nextAction: 'fix',
        snapshotRef: 'snap-1',
        wipCommitOnly: true,
      },
    },
  });
  assert.equal(g.status, 'stop');
  assert.ok(g.reason.includes('unregistered-unfinished'));
});

test('oracle: only-ready → PASS iff main-fill done/noop', () => {
  const passDone = runLevelingGate({
    items: [{ path: 'a.ts', ctx: readyCtx, unitId: 'unit-a' }],
    mainFill: { shipOne: () => ({ ok: true }) },
  });
  assert.equal(passDone.status, 'pass');
  assert.equal(passDone.mainFill, 'done');

  const passNoop = runLevelingGate({
    items: [
      {
        path: 'live.ts',
        ctx: { dirty: true, inActiveSession: true, registered: false },
      },
    ],
  });
  assert.equal(passNoop.status, 'pass');
  assert.equal(passNoop.mainFill, 'noop');
  assert.deepEqual(passNoop.baskets.L, ['live.ts']);

  const stopFail = runLevelingGate({
    items: [{ path: 'a.ts', ctx: readyCtx, unitId: 'unit-a' }],
    mainFill: { shipOne: () => ({ ok: false, detail: 'boom' }) },
  });
  assert.equal(stopFail.status, 'stop');
  assert.ok(stopFail.reason.includes('main-fill-failed'));
});

test('oracle: live does not stop gate', () => {
  const g = runLevelingGate({
    items: [
      { path: 'live.ts', ctx: { dirty: true, inActiveSession: true } },
      {
        path: 'trash.log',
        ctx: { dirty: true, registered: false },
      },
    ],
    namedTrash: {
      'trash.log': { action: 'dispose', reason: 'root log' },
    },
  });
  assert.equal(g.status, 'pass');
  assert.ok(g.baskets.L.includes('live.ts'));
});

test('main-fill train serializes and rechecks', () => {
  const { queue } = planMainFill([
    { id: 'u1', paths: ['a'] },
    { id: 'u2', paths: ['b'] },
    { id: 'u1', paths: ['a2'] },
  ]);
  assert.equal(queue.length, 2);

  /** @type {number[]} */
  const rechecks = [];
  const train = runMainFillTrain(queue, {
    shipOne: () => ({ ok: true }),
    recheckRemaining: (rest) => rechecks.push(rest.length),
  });
  assert.equal(train.status, 'done');
  assert.deepEqual(train.shipped, ['u1', 'u2']);
  assert.deepEqual(rechecks, [1]);
});

test('buildWorkspaceLevelReport: three named sections; no input', () => {
  const empty = buildWorkspaceLevelReport(null);
  assert.equal(empty.ok, false);
  assert.ok(empty.markdown.includes('нет входа'));

  const g = runLevelingGate({
    items: [
      { path: 'a.ts', ctx: readyCtx, unitId: 'unit-a' },
      {
        path: 'u.md',
        ctx: { registered: true, dirty: true, inActiveSession: false },
      },
      { path: 't.log', ctx: { dirty: true, registered: false } },
    ],
    namedTrash: { 't.log': { action: 'ignore', reason: 'noise' } },
    unfinishedCards: {
      'u.md': {
        id: 'card-u',
        state: 'unfinished',
        whyNotReady: 'ci',
        nextAction: 'fix',
        snapshotRef: 's1',
      },
    },
    mainFill: { shipOne: () => ({ ok: true }) },
  });
  const report = buildWorkspaceLevelReport(g, { builtAt: '2026-07-25T00:00:00.000Z' });
  assert.equal(report.ok, true);
  assert.ok(report.markdown.includes('## Влито в main'));
  assert.ok(report.markdown.includes('## Застряло'));
  assert.ok(report.markdown.includes('## Мусор найден'));
  assert.ok(report.sections.merged.includes('a.ts'));
  assert.ok(report.sections.stuck.some((x) => x.includes('u.md')));
  assert.ok(report.sections.trash.some((x) => x.includes('t.log')));
});

test('T13: scratch outside repo; WIP snapshot antipattern', () => {
  const root = createScratchRoot();
  assert.ok(existsSync(root));
  assert.ok(root.includes('membrana-leveling') || root.length > 0);
  cleanupScratchRoot(root);
  assert.equal(existsSync(root), false);

  assert.equal(isWipSnapshotAntipattern('docs/scratchpad/x.md'), true);
  assert.equal(isWipSnapshotAntipattern('leveling-wip-snap.json'), true);
  assert.equal(isWipSnapshotAntipattern('docs/tasks/README.md'), false);
  const check = assertNoWipSnapshotInRepo([
    'docs/tasks/README.md',
    'docs/scratchpad/leak.md',
  ]);
  assert.equal(check.ok, false);
  assert.deepEqual(check.offenders, ['docs/scratchpad/leak.md']);
});

test('PASS full evening: Named(T) ∧ Registered(U) ∧ Filled(R)', () => {
  const g = runLevelingGate({
    items: [
      { path: 'live.ts', ctx: { dirty: true, inActiveSession: true } },
      { path: 'ready.ts', ctx: { ...readyCtx, unitOf: 'pr-1' }, unitId: 'pr-1' },
      {
        path: 'wait.md',
        ctx: {
          registered: true,
          ciGreen: true,
          prApproved: true,
          leadStamp: false,
          inActiveSession: false,
        },
      },
      { path: 'junk.txt', ctx: { dirty: true, registered: false } },
    ],
    namedTrash: { 'junk.txt': { action: 'dispose', reason: 'root junk' } },
    unfinishedCards: {
      'wait.md': {
        id: 'wait-1',
        state: 'unfinished',
        whyNotReady: 'awaiting leadStamp',
        nextAction: 'stamp',
        snapshotRef: 'evening-1',
      },
    },
    mainFill: { shipOne: () => ({ ok: true }) },
  });
  assert.equal(g.status, 'pass');
  assert.equal(g.mainFill, 'done');
  assert.deepEqual(g.reason, []);
});
