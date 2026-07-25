import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  fetchRestPullMergeFields,
  isMergeBlocked,
  mapRestPullMergeFields,
  needsRestMergeRecheck,
  reconcileMergeability,
} from './pr-mergeability.mjs';

test('mapRestPullMergeFields: clean mergeable pull', () => {
  const snap = mapRestPullMergeFields({
    mergeable: true,
    mergeable_state: 'clean',
    head: { sha: '73756cd4abc' },
  });
  assert.equal(snap.mergeable, 'MERGEABLE');
  assert.equal(snap.mergeStateStatus, 'CLEAN');
  assert.equal(snap.headRefOid, '73756cd4abc');
});

test('#1028: graphql CONFLICTING + REST clean → rest-recheck', () => {
  const graphql = {
    mergeable: 'CONFLICTING',
    mergeStateStatus: 'DIRTY',
    headRefOid: 'c4fa4e0b',
  };
  const rest = mapRestPullMergeFields({
    mergeable: true,
    mergeable_state: 'clean',
    head: { sha: '73756cd4' },
  });
  assert.equal(needsRestMergeRecheck(graphql, rest), true);
  const out = reconcileMergeability(graphql, rest);
  assert.equal(out.mergeabilitySource, 'rest-recheck');
  assert.equal(out.mergeable, 'MERGEABLE');
  assert.equal(out.mergeStateStatus, 'CLEAN');
  assert.equal(out.headRefOid, '73756cd4');
  assert.equal(out.graphqlStale.mergeable, 'CONFLICTING');
});

test('head sha mismatch triggers recheck even when mergeable looks ok', () => {
  const graphql = { mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN', headRefOid: 'aaa' };
  const rest = { mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN', headRefOid: 'bbb' };
  assert.equal(needsRestMergeRecheck(graphql, rest), true);
});

test('isMergeBlocked', () => {
  assert.equal(isMergeBlocked({ mergeable: 'CONFLICTING', mergeStateStatus: 'CLEAN' }), true);
  assert.equal(isMergeBlocked({ mergeable: 'MERGEABLE', mergeStateStatus: 'DIRTY' }), true);
  assert.equal(isMergeBlocked({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' }), false);
});

test('fetchRestPullMergeFields uses gh api pulls', () => {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args]);
    return JSON.stringify({ mergeable: true, mergeable_state: 'clean', head: { sha: 'deadbeef' } });
  };
  const snap = fetchRestPullMergeFields(run, 'officefish/Membrana', 1023);
  assert.equal(snap?.mergeable, 'MERGEABLE');
  assert.deepEqual(calls[0], ['gh', 'api', 'repos/officefish/Membrana/pulls/1023']);
});
