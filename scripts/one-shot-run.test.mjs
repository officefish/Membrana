/**
 * Зубы контракта прогона шота (спринт `one-shot-recut`, блок `shot-run-contract`).
 *
 * Охраняемый рубеж — невозможность подлога назначения и различимость отказов: «не назначен»,
 * «нет следа контекста» и «след не раньше исполнения» — три разные лжи, и слить их в одно
 * «не готов» значило бы повторить слабость honest_pair (#1641) в новом месте.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ASSIGNED_BY,
  NOT_READY_REASONS,
  SHOT_RUN_POINTS,
  assignProblems,
  buildShotRunRecord,
  readyToExecute,
  shotRunProblems,
} from './lib/one-shot-run.mjs';
import { validateProcedureRunRecord } from './lib/procedure-run-journal.mjs';
import { HOLDER_PERSONAS } from './lib/procedure-personas.mjs';

const ASSIGN = Object.freeze({
  shotId: 'shot-fix-orphan-warning',
  executor: 'dynin',
  assignedBy: 'teamlead',
  contextRunRef: 'docs/discussions/shot-fix-orphan-dynin.md',
});

const point = (overrides = {}) =>
  buildShotRunRecord({
    runId: 'one-shot-2026-08-03-fix-orphan',
    sequence: 1,
    point: 'first-frame',
    status: 'pass',
    subject: 'старт шота: чек-лист собран',
    at: '2026-08-03T15:00:00+03:00',
    evidence: ['docs/discussions/shot-fix-orphan-checklist.md'],
    assign: ASSIGN,
    ...overrides,
  });

// ── подлог назначения невозможен ─────────────────────────────────────────────

test('исполнитель вне ростера — отказ с именем ростера', () => {
  const p = assignProblems({ ...ASSIGN, executor: 'krylov' });
  assert.equal(p.length, 1);
  assert.match(p[0], /вне ростера/u);
});

test('назначает только тимлид: PersonaId вместо литерала роли — отказ', () => {
  // Второй правды о том же факте не заводим: assignedBy — роль, не имя.
  const p = assignProblems({ ...ASSIGN, assignedBy: 'tarasov' });
  assert.equal(p.length, 1);
  assert.match(p[0], /назначает только teamlead/u);
});

test('ростер импортирован, а не отчеканен третьей копией', () => {
  // 03.08 вычинен ВТОРОЙ экземпляр устаревшего ростера (класс #1644). Зуб держит:
  // ростер здесь — тот же объект, что в валидаторе процедур, и тимлид в нём есть.
  assert.ok(HOLDER_PERSONAS.includes('tarasov'));
  const p = assignProblems({ ...ASSIGN, executor: 'tarasov' });
  assert.deepEqual(p, [], 'тимлид — законный исполнитель, если его назначили');
});

// ── три причины отказа различимы ─────────────────────────────────────────────

test('перечень причин закрыт тремя', () => {
  assert.deepEqual(
    [...NOT_READY_REASONS],
    ['missing_assign', 'missing_context_run', 'context_not_before_execute'],
  );
});

test('невалидное назначение — missing_assign с перечнем проблем', () => {
  const r = readyToExecute({ ...ASSIGN, executor: 'нет-такого' }, {
    contextRun: { personaId: 'dynin', at: '2026-08-03T14:00:00+03:00' },
    executeOpenedAt: '2026-08-03T15:00:00+03:00',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing_assign');
});

test('след не разрешился — missing_context_run, а не молчаливый ok', () => {
  const r = readyToExecute(ASSIGN, { contextRun: null, executeOpenedAt: '2026-08-03T15:00:00+03:00' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing_context_run');
  assert.match(r.problems[0], /не разрешился/u);
});

test('чужой след — missing_context_run: контекст исполнителя, не любой', () => {
  const r = readyToExecute(ASSIGN, {
    contextRun: { personaId: 'ozhegov', at: '2026-08-03T14:00:00+03:00' },
    executeOpenedAt: '2026-08-03T15:00:00+03:00',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing_context_run');
  assert.match(r.problems[0], /принадлежит/u);
});

test('предшествование СТРОГОЕ: равенство времён — отказ своей причиной', () => {
  const at = '2026-08-03T15:00:00+03:00';
  const r = readyToExecute(ASSIGN, { contextRun: { personaId: 'dynin', at }, executeOpenedAt: at });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'context_not_before_execute');
  assert.match(r.problems[0], /равенство тоже отказ/u);
});

test('всё на месте — ok без оговорок', () => {
  const r = readyToExecute(ASSIGN, {
    contextRun: { personaId: 'dynin', at: '2026-08-03T14:00:00+03:00' },
    executeOpenedAt: '2026-08-03T15:00:00+03:00',
  });
  assert.deepEqual(r, { ok: true });
});

// ── запись точки: журнал принимает без bump ──────────────────────────────────

test('запись с полями M2 в корне проходит валидатор журнала @1', () => {
  const rec = point();
  assert.deepEqual(validateProcedureRunRecord(rec), [], 'расширение корня не ломает схему');
  assert.equal(rec.shotId, ASSIGN.shotId);
  assert.equal(rec.executor, 'dynin');
  assert.equal(rec.schema, 'procedure-run-journal@1');
});

test('pass без вещдока бросает — строитель журнала, здесь не дублируется', () => {
  assert.throws(() => point({ evidence: [] }), /evidence/u);
});

test('точка вне трёх точек прогона — бросок', () => {
  assert.throws(() => point({ point: 'checklist' }), /вне трёх точек/u);
});

test('запись с невалидным назначением не собирается вовсе', () => {
  assert.throws(() => point({ assign: { ...ASSIGN, contextRunRef: '' } }), /назначение невалидно/u);
});

// ── связность прогона ────────────────────────────────────────────────────────

const run = (closeStatus = 'pass', closeGaps = [], closeEvidence = ['pr:#1666']) => [
  point(),
  point({
    sequence: 2,
    point: 'owner-ratify',
    at: '2026-08-03T15:30:00+03:00',
    subject: 'владелец ратифицировал чек-лист',
    evidence: ['цитата владельца: «да» 15:30'],
  }),
  point({
    sequence: 3,
    point: 'execute',
    at: '2026-08-03T16:00:00+03:00',
    status: closeStatus,
    subject: 'исполнение до «весь код дописан»',
    evidence: closeEvidence,
    gaps: closeGaps,
  }),
];

test('три append читаются связным прогоном: runId един, sequence 1..3, время монотонно', () => {
  assert.deepEqual(shotRunProblems(run()), []);
});

test('закрытие fail с gap oversize — ЗАКОННЫЙ исход, связность цела', () => {
  // M3: красный факт сохраняет запись, а не стирает — она кормит анти-цепочку.
  const records = run('fail', ['oversize'], ['budget:200', 'actual:340']);
  assert.deepEqual(shotRunProblems(records), []);
  assert.equal(records[2].status, 'fail');
  assert.deepEqual(records[2].coverage.gaps, ['oversize']);
});

test('смена исполнителя между точками рвёт прогон — исполнитель один (Т3)', () => {
  const records = run();
  records[2] = { ...records[2], executor: 'ozhegov' };
  assert.match(shotRunProblems(records).join(' '), /executor меняется/u);
});

test('немонотонное время — названная проблема, а не молчаливый порядок ленты', () => {
  const records = run();
  records[1] = { ...records[1], at: '2026-08-03T14:00:00+03:00' };
  assert.match(shotRunProblems(records).join(' '), /не монотонно/u);
});

test('литерал роли и три точки заморожены', () => {
  assert.equal(ASSIGNED_BY, 'teamlead');
  assert.deepEqual([...SHOT_RUN_POINTS], ['first-frame', 'owner-ratify', 'execute']);
  assert.ok(Object.isFrozen(SHOT_RUN_POINTS) && Object.isFrozen(NOT_READY_REASONS));
});

test('каждая причина из закрытого перечня достижима, других reason нет', () => {
  const seen = new Set();
  const ctx = { personaId: 'dynin', at: '2026-08-03T14:00:00+03:00' };
  const cases = [
    readyToExecute({ ...ASSIGN, executor: 'нет' }, { contextRun: ctx, executeOpenedAt: '2026-08-03T15:00:00+03:00' }),
    readyToExecute(ASSIGN, { contextRun: null, executeOpenedAt: '2026-08-03T15:00:00+03:00' }),
    readyToExecute(ASSIGN, { contextRun: { ...ctx, at: '2026-08-03T15:00:00+03:00' }, executeOpenedAt: '2026-08-03T15:00:00+03:00' }),
  ];
  for (const c of cases) {
    assert.equal(c.ok, false);
    assert.ok(NOT_READY_REASONS.includes(c.reason), `reason «${c.reason}» вне закрытого перечня`);
    seen.add(c.reason);
  }
  assert.equal(seen.size, NOT_READY_REASONS.length, 'каждая причина достигнута ровно своим случаем');
});

test('ранний возврат при неверном числе точек несёт счёт, а не молчит', () => {
  assert.deepEqual(shotRunProblems([point()]), ['точек 1 из 3']);
  assert.deepEqual(shotRunProblems('не массив'), ['точек 0 из 3']);
});
