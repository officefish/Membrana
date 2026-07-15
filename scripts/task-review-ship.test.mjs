import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractSquashSha, parseShipArgs, shipSteps } from './task-review-ship.mjs';

const SHA = 'd452582ddf2b194ee6c9ed6f485590490a21ca09'; // живой #451
const BASE = '23d6a5ba909b1d60534721732770b99276cc11dc';
const HEAD_AHEAD = '2f9dd5218631a0e06d9b0642a453a1d0f4699a1f';

test('parseShipArgs: id/pr/checks/review-file/execute', () => {
  const cli = parseShipArgs([
    '--id', 'my-task', '--pr', '461', '--check', 'yarn test:scripts',
    '--check', 'yarn docs:lint', '--review-file', 'r.md', '--execute',
  ]);
  assert.equal(cli.id, 'my-task');
  assert.equal(cli.pr, '461');
  assert.deepEqual(cli.checks, ['yarn test:scripts', 'yarn docs:lint']);
  assert.equal(cli.reviewFile, 'r.md');
  assert.equal(cli.execute, true);
});

test('extractSquashSha: смёрженный PR → SHA; иначе fail-closed', () => {
  assert.equal(extractSquashSha({ state: 'MERGED', mergeCommit: { oid: SHA } }), SHA);
  assert.throws(() => extractSquashSha({ state: 'OPEN', mergeCommit: { oid: SHA } }), /не смёржен/);
  assert.throws(() => extractSquashSha({ state: 'MERGED', mergeCommit: null }), /mergeCommit/);
  assert.throws(() => extractSquashSha({ state: 'MERGED', mergeCommit: { oid: 'short' } }), /mergeCommit/);
});

test('shipSteps: detached когда HEAD ушёл вперёд (золотой кейс #451)', () => {
  const plan = shipSteps({ id: 'persona-memory-all-personas', pr: 461, sha: SHA, base: BASE, headSha: HEAD_AHEAD, checks: ['x'], reviewFile: 'r.md' });
  assert.equal(plan.detached, true);
  assert.ok(plan.steps.some((s) => /detached checkout/.test(s)));
  assert.ok(plan.steps.some((s) => /родитель/.test(s)));
  assert.ok(plan.steps.some((s) => /--review-file/.test(s)));
});

test('shipSteps: без detached когда HEAD = squash-SHA', () => {
  const plan = shipSteps({ id: 't', pr: 1, sha: SHA, base: BASE, headSha: SHA, checks: [], reviewFile: null });
  assert.equal(plan.detached, false);
  assert.ok(plan.steps.some((s) => /detached checkout не нужен/.test(s)));
  assert.ok(plan.steps.some((s) => /LLM-ревью/.test(s)));
});
