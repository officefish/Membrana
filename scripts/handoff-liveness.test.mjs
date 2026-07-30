import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateHandoffRows,
  extractGithubCarriers,
  parseTop10Rows,
  renderHandoffLivenessReport,
} from './lib/handoff-liveness.mjs';

const SAMPLE = `# HANDOFF

## Топ-10 дня

| # | Работа | Боль | Размер | Зависимость | Занято |
|---|--------|------|--------|-------------|--------|
| 1 | **Open thing** [#10](https://github.com/officefish/Membrana/issues/10) | x | S | — | свободно |
| 2 | **Closed thing** [#11](https://github.com/officefish/Membrana/issues/11) | x | S | — | агент |
| 3 | **No issue** (карточка \`tw-handoff-liveness\`) | x | S | — | свободно |
| 4 | **Merged PR** ([#1481](https://github.com/officefish/Membrana/pull/1481)) | x | S | — | ✅ закрыто |

## Что уже в main
`;

test('parseTop10Rows extracts issue numbers and registry ids from top-10 only', () => {
  const rows = parseTop10Rows(SAMPLE);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0].issueNumbers, [10]);
  assert.deepEqual(rows[2].taskIds, ['tw-handoff-liveness']);
  assert.deepEqual(rows[3].pullNumbers, [1481]);
  assert.deepEqual(rows[3].carriers, [{ kind: 'pull', number: 1481 }]);
});

test('extractGithubCarriers: markdown PR link не превращается в issue #N', () => {
  assert.deepEqual(
    extractGithubCarriers('([#1481](https://github.com/officefish/Membrana/pull/1481)) и #1319'),
    [
      { kind: 'pull', number: 1481 },
      { kind: 'issue', number: 1319, ambiguous: true },
    ],
  );
});

test('evaluateHandoffRows: bare #N может разрешиться как PullRequest', () => {
  const rows = parseTop10Rows(`# HANDOFF

## Топ-10 дня

| # | Работа | Боль | Размер | Зависимость | Занято |
|---|--------|------|--------|-------------|--------|
| 1 | **Bare PR** #1481 | x | S | — | закрыто |
`);
  const evaluated = evaluateHandoffRows(rows, {
    ok: true,
    issues: new Map([[1481, { __typename: 'PullRequest', state: 'MERGED' }]]),
    error: null,
  });
  assert.equal(evaluated[0].liveness, 'dead');
  assert.match(evaluated[0].reason, /PR #1481 MERGED/u);
});

test('evaluateHandoffRows marks closed as dead and network failure as unknown', () => {
  const rows = parseTop10Rows(SAMPLE);
  const ok = evaluateHandoffRows(rows, {
    ok: true,
    issues: new Map([
      [10, { __typename: 'Issue', state: 'OPEN' }],
      [11, { __typename: 'Issue', state: 'CLOSED', stateReason: 'COMPLETED' }],
      [1481, { __typename: 'PullRequest', state: 'MERGED' }],
    ]),
    error: null,
  });
  assert.equal(ok[0].liveness, 'alive');
  assert.equal(ok[1].liveness, 'dead');
  assert.equal(ok[2].liveness, 'unknown');
  assert.equal(ok[3].liveness, 'dead');
  assert.match(ok[3].reason, /PR #1481 MERGED/u);

  const unknown = evaluateHandoffRows(rows, { ok: false, issues: new Map(), error: 'network down' });
  assert.equal(unknown[0].liveness, 'unknown');
  assert.match(unknown[0].reason, /network down/u);
});

test('renderHandoffLivenessReport names single batch query and dead count', () => {
  const rows = evaluateHandoffRows(parseTop10Rows(SAMPLE), {
    ok: true,
    issues: new Map([
      [10, { __typename: 'Issue', state: 'OPEN' }],
      [11, { __typename: 'Issue', state: 'CLOSED' }],
      [1481, { __typename: 'PullRequest', state: 'MERGED' }],
    ]),
    error: null,
  });
  const report = renderHandoffLivenessReport({ rows, issueResult: { ok: true }, generatedAt: '2026-07-27T00:00:00.000Z' });
  assert.match(report, /single GraphQL batch/u);
  assert.match(report, /PR #1481/u);
  assert.match(report, /dead=2/u);
  assert.match(report, /unknown=1/u);
});
