// #2081 хвост: находки вечера (deliver-to-main pending-ci, exit 3) попадают в журнал прогона.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { eveningCloseArgs } from './lib/ritual-evening-close-args.mjs';

test('находка pending-ci пишется во friction, статус остаётся pass', () => {
  const args = eveningCloseArgs({
    failed: [],
    findings: [{ id: 'deliver-to-main', exitCode: 3 }],
  });
  assert.equal(args[args.indexOf('--status') + 1], 'pass');
  assert.ok(args.includes('--friction'), 'находка не дошла до журнала — сирота');
  assert.equal(args[args.indexOf('--friction') + 1], 'deliver-to-main: finding exit 3');
  assert.ok(!args.includes('--gap'));
});

test('упавший критичный шаг — fail с gap; находки рядом не теряются', () => {
  const args = eveningCloseArgs({
    failed: [{ id: 'evening-tail' }],
    findings: [{ id: 'insight-drift', exitCode: 3 }],
  });
  assert.equal(args[args.indexOf('--status') + 1], 'fail');
  assert.deepEqual(args.slice(args.indexOf('--gap'), args.indexOf('--gap') + 2), ['--gap', 'evening-tail']);
  assert.ok(args.includes('insight-drift: finding exit 3'));
});

test('порча: без находок и без падений — чистый pass без friction/gap', () => {
  const args = eveningCloseArgs({ failed: [], findings: [] });
  assert.deepEqual(args, ['close', '--procedure', 'ritual-evening', '--status', 'pass', '--evidence', 'docs/HANDOFF.md']);
});
