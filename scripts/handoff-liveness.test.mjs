import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateHandoffRows,
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

## Что уже в main
`;

test('parseTop10Rows extracts issue numbers and registry ids from top-10 only', () => {
  const rows = parseTop10Rows(SAMPLE);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0].issueNumbers, [10]);
  assert.deepEqual(rows[2].taskIds, ['tw-handoff-liveness']);
});

test('evaluateHandoffRows marks closed as dead and network failure as unknown', () => {
  const rows = parseTop10Rows(SAMPLE);
  const ok = evaluateHandoffRows(rows, {
    ok: true,
    issues: new Map([
      [10, { state: 'OPEN' }],
      [11, { state: 'CLOSED', stateReason: 'COMPLETED' }],
    ]),
    error: null,
  });
  assert.equal(ok[0].liveness, 'alive');
  assert.equal(ok[1].liveness, 'dead');
  assert.equal(ok[2].liveness, 'unknown');

  const unknown = evaluateHandoffRows(rows, { ok: false, issues: new Map(), error: 'network down' });
  assert.equal(unknown[0].liveness, 'unknown');
  assert.match(unknown[0].reason, /network down/u);
});

test('renderHandoffLivenessReport names single batch query and dead count', () => {
  const rows = evaluateHandoffRows(parseTop10Rows(SAMPLE), {
    ok: true,
    issues: new Map([
      [10, { state: 'OPEN' }],
      [11, { state: 'CLOSED' }],
    ]),
    error: null,
  });
  const report = renderHandoffLivenessReport({ rows, issueResult: { ok: true }, generatedAt: '2026-07-27T00:00:00.000Z' });
  assert.match(report, /single GraphQL batch/u);
  assert.match(report, /dead=1/u);
  assert.match(report, /unknown=1/u);
});
