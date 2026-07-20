import assert from 'node:assert/strict';
import test from 'node:test';

import { makeClosureArtifact, makeSnapshot, makeSnapshotPair } from './lib/measure-fixtures.mjs';
import { computeTeamMetrics, UNATTRIBUTED, windowFromSnapshots } from './lib/measure-metrics.mjs';
import { computeReworkRhetoric } from './lib/measure-rework-rhetoric.mjs';

test('снимок без honest-провенанса — не вход: жёсткая ошибка', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  assert.throws(() => computeTeamMetrics({ cards: [] }, curr, closureArtifacts), /honest-провенанса/);
  assert.throws(() => computeTeamMetrics(prev, { header: { capturedAt: 'x' }, cards: [] }, []), /honest-провенанса/);
});

test('окно по умолчанию — из capturedAt снимков; перепутанные снимки — ошибка', () => {
  const { prev, curr } = makeSnapshotPair();
  assert.deepEqual(windowFromSnapshots(prev, curr), {
    from: '2026-07-18T18:00:00.000Z',
    to: '2026-07-19T18:00:00.000Z',
  });
  assert.throws(() => computeTeamMetrics(curr, prev, []), /Окно вырождено/);
});

test('батч считает ровно пять величин — риторической reworkRate среди них нет', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const result = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.deepEqual(Object.keys(result.metrics), [
    'leadTime',
    'ownerlessRate',
    'wip',
    'throughput',
    'escalationRate',
  ]);
});

test('honest-шапка: окно, ревизии обоих снимков, множество артефактов', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const { header } = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.equal(header.prevRevision, 'f'.repeat(40));
  assert.equal(header.currRevision, 'e'.repeat(40));
  assert.deepEqual(header.artifactsCounted, ['t-2']);
  assert.deepEqual(header.window, { from: '2026-07-18T18:00:00.000Z', to: '2026-07-19T18:00:00.000Z' });
});

test('leadTime = closedAt − createdAt по закрытым в окне единицам', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const { metrics } = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.deepEqual(metrics.leadTime.values, [{ taskId: 't-2', ms: 54 * 3_600_000 }]);
});

test('артефакт вне окна не учитывается (t-3 закрыта до среза t−1)', () => {
  const { prev, curr } = makeSnapshotPair();
  const stale = makeClosureArtifact({ taskId: 't-3', closedAt: '2026-07-18T12:00:00.000Z' });
  const { header, metrics } = computeTeamMetrics(prev, curr, [stale]);
  assert.deepEqual(header.artifactsCounted, []);
  assert.deepEqual(metrics.leadTime.values, []);
});

test('ownerlessRate — доля leadPersona = ∅ на текущем срезе', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const { metrics } = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.equal(metrics.ownerlessRate.ownerless, 1); // t-5
  assert.equal(metrics.ownerlessRate.total, 6);
  assert.ok(Math.abs(metrics.ownerlessRate.value - 1 / 6) < 1e-12);
});

test('wip(p) — движущиеся единицы по персонам, ничья очередь не теряется', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const { metrics } = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.deepEqual(metrics.wip.byPersona, {
    [UNATTRIBUTED]: 1, // t-5
    ozhegov: 1, // t-3 (переоткрыта)
    rodchenko: 1, // t-4
    vesnin: 2, // t-1, t-6
  });
  assert.equal(metrics.wip.note, 'очередь намерений, не производительность');
});

test('throughput(p, w) — закрытые в окне, атрибуция по leadPersona карточки', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const { metrics } = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.deepEqual(metrics.throughput.byPersona, { dynin: 1 });
});

test('escalationRate — смена leadPersona между срезами; null → null сменой не является', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const { metrics } = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.deepEqual(metrics.escalationRate.escalatedIds, ['t-4']); // kuryokhin → rodchenko
  assert.equal(metrics.escalationRate.of, 5); // t-1..t-5 в обоих срезах
  assert.ok(Math.abs(metrics.escalationRate.value - 0.2) < 1e-12);
});

test('переприсвоение приёмки в истории артефакта — тоже эскалация', () => {
  const { prev, curr } = makeSnapshotPair();
  const reassigned = makeClosureArtifact({
    taskId: 't-2',
    closedAt: '2026-07-19T15:00:00.000Z',
    acceptanceHistory: [
      { acceptedBy: 'ozhegov', headRev: 'a'.repeat(40) },
      { acceptedBy: 'dynin', headRev: 'a'.repeat(40) },
    ],
  });
  const { metrics } = computeTeamMetrics(prev, curr, [reassigned]);
  assert.ok(metrics.escalationRate.escalatedIds.includes('t-2'));
});

test('детерминизм: тот же вход → тот же отчёт бит-в-бит', () => {
  const a = makeSnapshotPair();
  const b = makeSnapshotPair();
  const r1 = computeTeamMetrics(a.prev, a.curr, a.closureArtifacts);
  const r2 = computeTeamMetrics(b.prev, b.curr, b.closureArtifacts);
  assert.equal(JSON.stringify(r1), JSON.stringify(r2));
});

test('риторическая: вход — те же два снимка + артефакты; переоткрытие наблюдается', () => {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  const r = computeReworkRhetoric(prev, curr, closureArtifacts);
  assert.equal(r.rhetorical, true);
  assert.deepEqual(r.events, [{ taskId: 't-3', kind: 'reopened' }]);
  assert.equal(r.considered, 2); // t-3 (закрыта в prev) + t-2 (артефакт)
  assert.ok(Math.abs(r.rate - 0.5) < 1e-12);
});

test('риторическая: отзыв приёмки и регресс headRev — по истории артефакта', () => {
  const { prev, curr } = makeSnapshotPair();
  const messy = makeClosureArtifact({
    taskId: 't-2',
    closedAt: '2026-07-19T15:00:00.000Z',
    acceptance: { acceptedBy: null, headRev: 'b'.repeat(40) },
    acceptanceHistory: [
      { acceptedBy: 'dynin', headRev: 'a'.repeat(40) },
      { acceptedBy: 'dynin', headRev: 'b'.repeat(40) },
    ],
  });
  const r = computeReworkRhetoric(prev, curr, [messy]);
  const kinds = r.events.filter((e) => e.taskId === 't-2').map((e) => e.kind);
  assert.deepEqual(kinds.sort(), ['acceptance-revoked', 'headrev-regress']);
});

test('пустой мир: нулевые знаменатели не делят на ноль', () => {
  const empty1 = makeSnapshot({ capturedAt: '2026-07-18T18:00:00.000Z', sourceRevision: 'f'.repeat(40), cards: [] });
  const empty2 = makeSnapshot({ capturedAt: '2026-07-19T18:00:00.000Z', sourceRevision: 'e'.repeat(40), cards: [] });
  const { metrics } = computeTeamMetrics(empty1, empty2, []);
  assert.equal(metrics.ownerlessRate.value, 0);
  assert.equal(metrics.escalationRate.value, 0);
  assert.equal(computeReworkRhetoric(empty1, empty2, []).rate, 0);
});
