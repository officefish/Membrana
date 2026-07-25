import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  bucketByDisposition,
  disposition,
  inferTempOrScratch,
  readyFacts,
} from './lib/membrana-leveling-disposition.mjs';
import { PRODUCT_CASES } from './fixtures/membrana-leveling-disposition-product.mjs';

test('inferTempOrScratch: temp / scratchpad / .tmp', () => {
  assert.equal(inferTempOrScratch('C:/Users/x/AppData/Local/Temp/foo.md'), true);
  assert.equal(inferTempOrScratch('%TEMP%/wip.txt'), true);
  assert.equal(inferTempOrScratch('/tmp/x'), true);
  assert.equal(inferTempOrScratch('docs/scratchpad/note.md'), true);
  assert.equal(inferTempOrScratch('scripts/cache/x.tmp'), true);
  assert.equal(inferTempOrScratch('docs/tasks/README.md'), false);
});

test('readyFacts: needs ciGreen ∧ ¬conflicts ∧ prApproved', () => {
  assert.equal(readyFacts({ ciGreen: true, conflictsMain: false, prApproved: true }), true);
  assert.equal(readyFacts({ ciGreen: true, conflictsMain: true, prApproved: true }), false);
  assert.equal(readyFacts({ ciGreen: true, conflictsMain: false, prApproved: false }), false);
});

test('1: isTempOrScratch → trash even in active session', () => {
  assert.equal(
    disposition('%TEMP%/shot.md', {
      dirty: true,
      inActiveSession: true,
      registered: true,
      isTempOrScratch: true,
    }),
    'trash',
  );
  assert.equal(
    disposition('docs/scratchpad/x.md', { dirty: true, inActiveSession: true }),
    'trash',
  );
});

test('2: dirty ∧ inActiveSession → live (before fallback trash)', () => {
  assert.equal(
    disposition('apps/client/src/App.tsx', {
      dirty: true,
      registered: false,
      inActiveSession: true,
    }),
    'live',
  );
});

test('3: readyFacts ∧ stamp ∧ registered ∧ ¬session → ready', () => {
  assert.equal(
    disposition('scripts/lib/foo.mjs', {
      dirty: false,
      registered: true,
      inActiveSession: false,
      ciGreen: true,
      conflictsMain: false,
      prApproved: true,
      leadStamp: true,
      unitOf: 'pr-42',
    }),
    'ready',
  );
});

test('readyFacts ∧ ¬stamp → unfinished (not ready)', () => {
  assert.equal(
    disposition('scripts/lib/foo.mjs', {
      registered: true,
      inActiveSession: false,
      ciGreen: true,
      conflictsMain: false,
      prApproved: true,
      leadStamp: false,
    }),
    'unfinished',
  );
});

test('4: registered ∧ ¬ready → unfinished', () => {
  assert.equal(
    disposition('docs/prompts/X.md', {
      registered: true,
      dirty: true,
      inActiveSession: false,
      ciGreen: false,
    }),
    'unfinished',
  );
});

test('5: dirty ∧ ¬registered → trash (fallback, after live)', () => {
  assert.equal(
    disposition('root-orphan.log', {
      dirty: true,
      registered: false,
      inActiveSession: false,
    }),
    'trash',
  );
});

test('totality: clean unregistered → trash', () => {
  assert.equal(disposition('mystery.bin', {}), 'trash');
});

test('ctx.isTempOrScratch overrides path heuristic', () => {
  assert.equal(
    disposition('docs/tasks/README.md', { isTempOrScratch: true }),
    'trash',
  );
  assert.equal(
    disposition('%TEMP%/keep.md', {
      isTempOrScratch: false,
      dirty: true,
      inActiveSession: true,
    }),
    'live',
  );
});

test('bucketByDisposition groups baskets', () => {
  const b = bucketByDisposition([
    { path: 'a.ts', ctx: { dirty: true, inActiveSession: true } },
    {
      path: 'b.ts',
      ctx: {
        registered: true,
        ciGreen: true,
        prApproved: true,
        leadStamp: true,
      },
    },
    { path: 'c.ts', ctx: { registered: true } },
    { path: 'd.tmp', ctx: { dirty: true } },
  ]);
  assert.deepEqual(b.live, ['a.ts']);
  assert.deepEqual(b.ready, ['b.ts']);
  assert.deepEqual(b.unfinished, ['c.ts']);
  assert.deepEqual(b.trash, ['d.tmp']);
});

test('product criterion: ≥10 hand-labeled cases match disposition', () => {
  assert.ok(PRODUCT_CASES.length >= 10, `need ≥10, got ${PRODUCT_CASES.length}`);
  /** @type {string[]} */
  const mismatches = [];
  for (const row of PRODUCT_CASES) {
    const fact = disposition(row.path, row.ctx);
    if (fact !== row.expect) {
      mismatches.push(`${row.path}: expect ${row.expect}, got ${fact} (${row.kind})`);
    }
  }
  assert.equal(mismatches.length, 0, mismatches.join('\n'));
});
