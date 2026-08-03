/**
 * Зубы блока sprint-producer (спринт run-journal-producer, 03.08): ратификация
 * открывает прогон спринта в журнале процедур, гейт закрывает его вердиктом.
 * Болезнь-вещдок: запись спринта one-shot-recut 03.08 сделана РУКОЙ.
 */
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { closeSprintRunFromReport } from './execution-gate.mjs';
import { ensureSprintRunOpen, SPRINT_PROCEDURE_ID, sprintTrailRelPath } from './sprint-cut-check.mjs';
import { findUnclosedRuns, readProcedureRunTrail } from './lib/procedure-run-journal.mjs';

const tempRepo = () => mkdtempSync(join(tmpdir(), 'sprint-producer-'));

const PLAN = Object.freeze({
  schema: 'sprint-cut/1',
  sprintId: 'demo-sprint',
  blocks: [{ blockId: 'b1' }, { blockId: 'b2' }],
  ratification: { by: 'owner', at: '2026-08-03T17:31:43+03:00', digest: 'd'.repeat(64) },
});
const PLAN_REL = 'docs/sprint/cut/demo-sprint.json';
const TRACES_REL = 'docs/sprint/trail/demo-sprint.jsonl';

const reportOf = (exitCode, verdicts) => ({
  exitCode,
  checkedBlocks: verdicts.length,
  blocks: verdicts.map((verdict, i) => ({
    blockId: `b${i + 1}`,
    verdict,
    stopped: !verdict.startsWith('honest_'),
  })),
});

test('лента выводится из ratification.at, не из часов процесса', () => {
  assert.equal(sprintTrailRelPath(PLAN), 'docs/procedure-runs/trail/2026-08-03.jsonl');
  assert.throws(() => sprintTrailRelPath({ sprintId: 'x' }), /без читаемой ratification\.at/u);
});

test('ratify открывает прогон: runId = sprintId, вещдок — путь плана', () => {
  const dir = tempRepo();
  const res = ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  assert.equal(res.opened, true);
  assert.equal(res.record.runId, 'demo-sprint');
  assert.equal(res.record.procedureId, SPRINT_PROCEDURE_ID);
  assert.equal(res.record.status, 'started');
  assert.equal(res.record.at, PLAN.ratification.at, 'прогон начинается словом владельца, не запуском CLI');
  assert.deepEqual(res.record.coverage.evidence, [PLAN_REL]);
});

test('повторный ratify идемпотентен: находит открытую, второй open не плодит', () => {
  const dir = tempRepo();
  ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  const second = ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  assert.equal(second.opened, false);
  assert.match(second.reason, /второй правдой/u);
  const records = readProcedureRunTrail(dir, sprintTrailRelPath(PLAN));
  assert.equal(records.filter((r) => r.runPhase === 'open').length, 1);
});

test('гейт зелёный закрывает pass; все honest_* — без gaps', () => {
  const dir = tempRepo();
  ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  const res = closeSprintRunFromReport(dir, {
    plan: PLAN,
    planRelPath: PLAN_REL,
    tracesRelPath: TRACES_REL,
    report: reportOf(0, ['honest_pair', 'honest_pair']),
    nowIso: '2026-08-04T18:00:00+03:00',
  });
  assert.equal(res.closed, true);
  assert.equal(res.record.status, 'pass');
  assert.deepEqual(res.record.coverage.gaps, []);
  assert.deepEqual(res.record.coverage.evidence, [TRACES_REL, PLAN_REL]);
});

test('любой стоп закрывает fail, gaps — уникальные имена вердиктов', () => {
  const dir = tempRepo();
  ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  const res = closeSprintRunFromReport(dir, {
    plan: PLAN,
    planRelPath: PLAN_REL,
    tracesRelPath: TRACES_REL,
    report: reportOf(1, ['honest_pair', 'plan_lied', 'plan_lied', 'stale_trace']),
    nowIso: '2026-08-04T18:00:00+03:00',
  });
  assert.equal(res.record.status, 'fail');
  assert.deepEqual(res.record.coverage.gaps, ['plan_lied', 'stale_trace'], 'род лжи виден без открытия отчёта');
});

test('без open-записи гейт лишь замер: close не пишется и не бросает', () => {
  const dir = tempRepo();
  const res = closeSprintRunFromReport(dir, {
    plan: PLAN,
    planRelPath: PLAN_REL,
    tracesRelPath: TRACES_REL,
    report: reportOf(1, ['plan_lied']),
    nowIso: '2026-08-04T18:00:00+03:00',
  });
  assert.equal(res.closed, false);
  assert.match(res.reason, /открывает sprint:cut --ratify/u);
  assert.deepEqual(readProcedureRunTrail(dir, sprintTrailRelPath(PLAN)), []);
});

test('exit 2 — проверка не состоялась: вердикта для журнала нет', () => {
  const dir = tempRepo();
  ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  const res = closeSprintRunFromReport(dir, {
    plan: PLAN,
    planRelPath: PLAN_REL,
    tracesRelPath: TRACES_REL,
    report: reportOf(2, []),
    nowIso: '2026-08-04T18:00:00+03:00',
  });
  assert.equal(res.closed, false);
  assert.match(res.reason, /не состоялась/u);
  assert.equal(findUnclosedRuns(readProcedureRunTrail(dir, sprintTrailRelPath(PLAN)), SPRINT_PROCEDURE_ID).length, 1, 'прогон остался открыт');
});

test('после close: повторный гейт не пишет вторую правду, повторный ratify не переоткрывает', () => {
  const dir = tempRepo();
  ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  const args = {
    plan: PLAN, planRelPath: PLAN_REL, tracesRelPath: TRACES_REL,
    report: reportOf(0, ['honest_pair']), nowIso: '2026-08-04T18:00:00+03:00',
  };
  closeSprintRunFromReport(dir, args);
  const again = closeSprintRunFromReport(dir, args);
  assert.equal(again.closed, false);
  assert.match(again.reason, /второй правдой/u);
  const reopen = ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  assert.equal(reopen.opened, false);
  assert.match(reopen.reason, /спринт прожит/u);
});

test('шероховатости свода едут в close-запись симптомами, корень — nullable-долг', () => {
  const dir = tempRepo();
  ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  const res = closeSprintRunFromReport(dir, {
    plan: PLAN, planRelPath: PLAN_REL, tracesRelPath: TRACES_REL,
    report: reportOf(0, ['honest_pair']), nowIso: '2026-08-04T18:00:00Z',
    frictionSymptoms: ['ревью приняло смешение форм времени за нарушение монотонности'],
  });
  assert.deepEqual(res.record.friction, [{
    symptom: 'ревью приняло смешение форм времени за нарушение монотонности',
    root: null, fix: null, prevention: null,
  }]);
});

test('без шероховатостей close-запись поля friction не несёт вовсе', () => {
  const dir = tempRepo();
  ensureSprintRunOpen(dir, PLAN, PLAN_REL);
  const res = closeSprintRunFromReport(dir, {
    plan: PLAN, planRelPath: PLAN_REL, tracesRelPath: TRACES_REL,
    report: reportOf(0, ['honest_pair']), nowIso: '2026-08-04T18:00:00Z',
    frictionSymptoms: [],
  });
  assert.equal(res.record.friction, undefined, 'пустой friction: [] был бы шумом формы');
});
