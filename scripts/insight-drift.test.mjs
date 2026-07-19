import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  byCodePoint,
  diagnosticsToDrifts,
  diffRegistries,
  renderDriftReport,
  tasksForInsight,
} from './insight-drift.mjs';

// ─── регресс-фикстуры: три реальных расхождения 2026-07-13 (до бэкфилла PR #432) ──

const INSIGHTS_20260713 = [
  { id: 'insight-hermes-liaison-agent', status: 'adopted', sprintPhase: null },
  { id: 'insight-comms-contour-topology', status: 'adopted', sprintPhase: null },
  { id: 'insight-live-neural-combined-detector', status: 'deferred', sprintPhase: null },
  { id: 'insight-task-archive-storage', status: 'adopted', sprintPhase: null }, // чистый
];

const TASKS_20260713 = [
  { id: 'hermes-brief', status: 'archived', insightId: 'insight-hermes-liaison-agent' },
  {
    id: 'comms-contour-environment',
    status: 'archived',
    insightId: null,
    notes: 'Вариант A (INSIGHT insight-comms-contour-topology, adopted).',
  },
  {
    id: 'live-neural-combined-fusion',
    status: 'active',
    insightId: 'insight-live-neural-combined-detector',
  },
  { id: 'unrelated-task', status: 'active', insightId: null, notes: '' },
];

test('регресс 2026-07-13: три расхождения ловятся (hermes/comms archived-no-phase, live-neural active+deferred)', () => {
  const drifts = diffRegistries(INSIGHTS_20260713, TASKS_20260713);
  const kinds = drifts.map((d) => `${d.insightId}:${d.kind}`);
  assert.deepEqual(kinds, [
    'insight-comms-contour-topology:archived-no-phase',
    'insight-hermes-liaison-agent:archived-no-phase',
    'insight-live-neural-combined-detector:active-no-phase',
    'insight-live-neural-combined-detector:deferred-active',
  ]);
});

test('после бэкфилла (sprintPhase проставлен, status adopted) — дрейфа нет', () => {
  const fixed = [
    { id: 'insight-hermes-liaison-agent', status: 'adopted', sprintPhase: 'hermes-brief' },
    { id: 'insight-comms-contour-topology', status: 'adopted', sprintPhase: 'comms-contour-environment' },
    { id: 'insight-live-neural-combined-detector', status: 'adopted', sprintPhase: 'live-neural-combined-fusion' },
  ];
  assert.deepEqual(diffRegistries(fixed, TASKS_20260713), []);
});

test('phase-missing: sprintPhase указывает на несуществующую задачу', () => {
  const drifts = diffRegistries(
    [{ id: 'insight-x', status: 'adopted', sprintPhase: 'ghost-sprint' }],
    TASKS_20260713,
  );
  assert.equal(drifts.length, 1);
  assert.equal(drifts[0].kind, 'phase-missing');
});

test('tasksForInsight: матчит и по insightId, и по упоминанию в notes', () => {
  assert.equal(tasksForInsight(TASKS_20260713, 'insight-comms-contour-topology').length, 1);
  assert.equal(tasksForInsight(TASKS_20260713, 'insight-hermes-liaison-agent').length, 1);
  assert.equal(tasksForInsight(TASKS_20260713, 'insight-нет-такого').length, 0);
});

test('детерминизм: одинаковый вход → байт-в-байт одинаковый отчёт', () => {
  const a = renderDriftReport(diffRegistries(INSIGHTS_20260713, TASKS_20260713));
  const b = renderDriftReport(diffRegistries(INSIGHTS_20260713, TASKS_20260713));
  assert.equal(a, b);
});

test('снапшот отчёта: статус словом, выравнивание, лечение в подвале', () => {
  const report = renderDriftReport(diffRegistries(INSIGHTS_20260713, TASKS_20260713));
  assert.ok(report.startsWith('[drift] insight-drift: diagnostics 4'));
  assert.ok(report.includes('| детали'));
  assert.ok(report.includes('Лечение: yarn insight verify'));
  assert.ok(!report.includes(String.fromCharCode(27)), 'без ANSI-цветов — статус только словом');
});

test('diagnosticsToDrifts: verify diagnostics → ritual table rows', () => {
  const drifts = diagnosticsToDrifts([
    { code: 'PROJECTION_DRIFT', message: 'Projection differs from replay', subjectRef: 'lifecycle' },
  ]);
  assert.deepEqual(drifts, [{
    insightId: 'lifecycle',
    kind: 'PROJECTION_DRIFT',
    detail: 'Projection differs from replay',
  }]);
});

test('чистые реестры → [ok] и пустой список', () => {
  assert.deepEqual(diffRegistries([], []), []);
  assert.ok(renderDriftReport([]).startsWith('[ok]'));
});

test('byCodePoint: локале-независимый порядок', () => {
  assert.deepEqual(['б', 'а', 'e'].sort(byCodePoint), ['e', 'а', 'б']);
});
