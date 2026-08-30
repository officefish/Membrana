import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNightSummary, buildNightSummaryFromGithub, renderNightSummaryMarkdown } from './lib/night-summary.mjs';

const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function run(overrides = {}) {
  return {
    databaseId: 42,
    event: 'schedule',
    status: 'completed',
    conclusion: 'success',
    createdAt: '2026-08-30T03:41:00Z',
    updatedAt: '2026-08-30T03:43:00Z',
    headSha: HEAD,
    ...overrides,
  };
}

test('buildNightSummary: все ночные workflow на вершине ствола дают одну зелёную сводку', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    workflows: [
      { id: 'a', title: 'A', workflow: 'a.yml', required: true },
      { id: 'b', title: 'B', workflow: 'b.yml', required: true },
    ],
    runsByWorkflow: {
      'a.yml': run({ databaseId: 1 }),
      'b.yml': run({ databaseId: 2 }),
    },
  });

  assert.equal(summary.kind, 'night-summary');
  assert.equal(summary.execution.status, 'pass');
  assert.equal(summary.workflows.length, 2);
  assert.deepEqual(summary.problems, []);
  assert.match(renderNightSummaryMarkdown(summary), /A \| pass/u);
});

test('buildNightSummary: чужая вершина и красный workflow видны в одном файле', () => {
  const summary = buildNightSummary({
    expectedRevision: HEAD,
    workflows: [
      { id: 'stale', title: 'Stale', workflow: 'stale.yml', required: true },
      { id: 'red', title: 'Red', workflow: 'red.yml', required: true },
    ],
    runsByWorkflow: {
      'stale.yml': run({ headSha: OTHER }),
      'red.yml': run({ conclusion: 'failure' }),
    },
  });

  assert.equal(summary.execution.status, 'fail');
  assert.equal(summary.workflows[0].status, 'stale');
  assert.equal(summary.workflows[1].status, 'red');
  assert.match(summary.problems.join('\n'), /Stale: запуск на bbbbbbbbbbbb/u);
  assert.match(summary.problems.join('\n'), /Red: conclusion=failure/u);
});

test('buildNightSummaryFromGithub: gh-сбой становится видимым пунктом сводки', () => {
  const summary = buildNightSummaryFromGithub({
    cwd: process.cwd(),
    expectedRevision: HEAD,
    exec: (_cmd, args) => {
      if (args.includes('vitest-nightly.yml')) throw new Error('api down');
      return JSON.stringify([run({ databaseId: args.includes('network-probes-nightly.yml') ? 10 : 11 })]);
    },
  });

  const vitest = summary.workflows.find((item) => item.workflow === 'vitest-nightly.yml');
  assert.equal(summary.execution.status, 'fail');
  assert.equal(vitest.status, 'missing');
  assert.match(vitest.reason, /gh run list не отработал/u);
  assert.equal(summary.problems.length, 1);
  assert.match(renderNightSummaryMarkdown(summary), /Vitest nightly \| missing/u);
});
