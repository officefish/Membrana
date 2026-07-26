import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertPrMergeableOrRegistryLand,
  parsePrLandArgs,
  planPrLand,
  prTouchesRegistry,
  registryMergeLandHint,
  REGISTRY_JSON,
} from './lib/task-pr-land.mjs';

test('prTouchesRegistry: registry.json и README', () => {
  assert.equal(prTouchesRegistry(['docs/tasks/registry.json']), true);
  assert.equal(prTouchesRegistry(['docs/tasks/README.md']), true);
  assert.equal(prTouchesRegistry(['packages/core/src/index.ts']), false);
});

test('registryMergeLandHint только при touchesRegistry', () => {
  assert.equal(registryMergeLandHint({ touchesRegistry: false }), '');
  assert.match(registryMergeLandHint({ touchesRegistry: true, prNumber: 532 }), /task:pr-land 532/u);
  assert.match(registryMergeLandHint({ touchesRegistry: true }), /union-драйвер/u);
});

test('assertPrMergeableOrRegistryLand: CONFLICTING + registry → hint task:pr-land', () => {
  assert.throws(
    () =>
      assertPrMergeableOrRegistryLand({
        mergeable: 'CONFLICTING',
        mergeStateStatus: 'DIRTY',
        touchesRegistry: true,
        prNumber: 1023,
        branch: 'feat/x',
      }),
    /task:pr-land 1023/u,
  );
});

test('assertPrMergeableOrRegistryLand: MERGEABLE — ok', () => {
  assert.doesNotThrow(() =>
    assertPrMergeableOrRegistryLand({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' }),
  );
});

test('planPrLand: merge origin/main без -m, затем pr:ship --merge-only', () => {
  const { steps } = planPrLand({ prNumber: 532, branch: 'feat/x', currentBranch: 'feat/x', execute: true });
  const merge = steps.find((s) => s.label === 'merge-main');
  assert.deepEqual(merge?.args, ['merge', 'origin/main']);
  assert.ok(!merge?.args.includes('-m'));
  const ship = steps.find((s) => s.label === 'ship-merge');
  assert.deepEqual(ship?.args, ['pr:ship', '--merge-only', '--execute']);
});

test('planPrLand: --no-wait пробрасывается в pr:ship', () => {
  const { steps } = planPrLand({ prNumber: 1, wait: false, execute: true });
  const ship = steps.find((s) => s.label === 'ship-merge');
  assert.deepEqual(ship?.args, ['pr:ship', '--merge-only', '--no-wait', '--execute']);
});

test('planPrLand: preflight checkout если не на ветке PR', () => {
  const { preflight } = planPrLand({ prNumber: 1, branch: 'feat/x', currentBranch: 'main' });
  assert.match(String(preflight), /checkout feat\/x/u);
});

test('parsePrLandArgs', () => {
  assert.deepEqual(parsePrLandArgs(['532', '--execute', '--no-wait']), {
    help: false,
    execute: true,
    noWait: true,
    prNumber: '532',
    base: 'main',
  });
});

test(`живой прецедент #1026: путь ${REGISTRY_JSON} в списке файлов`, () => {
  assert.ok(prTouchesRegistry(['docs/tasks/registry.json', 'package.json']));
});
