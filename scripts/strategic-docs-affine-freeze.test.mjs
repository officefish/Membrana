import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AFFINE_FREEZE_BYPASS_FLAG,
  affineFreezeMessage,
  stripAffineFreezeBypass,
} from './lib/strategic-docs-affine-freeze.mjs';

test('stripAffineFreezeBypass removes only explicit bypass flag', () => {
  const r = stripAffineFreezeBypass(['--dry-run', AFFINE_FREEZE_BYPASS_FLAG, '--target', 'templates']);
  assert.equal(r.bypass, true);
  assert.deepEqual(r.argv, ['--dry-run', '--target', 'templates']);
});

test('affineFreezeMessage names source, precedent, reason and bypass', () => {
  const message = affineFreezeMessage({
    commandName: 'strategic-docs:publish',
    source: 'docs/containers/strategic-docs/workshop.catalog.json',
    raw: {
      since: '2026-07-26',
      reason: 'five repairs in one day',
      precedent: 'docs/precedents/2026-07-26-affine-editor-paradigm-impedance.md',
      bypassFlag: AFFINE_FREEZE_BYPASS_FLAG,
    },
  });
  assert.match(message, /frozen since 2026-07-26/u);
  assert.match(message, /five repairs in one day/u);
  assert.match(message, /2026-07-26-affine-editor/u);
  assert.match(message, /--allow-affine-frozen-publish/u);
});
