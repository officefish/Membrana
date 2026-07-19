import assert from 'node:assert/strict';
import test from 'node:test';

import { EXIT_CODES } from './snapshot-contract.mjs';
import {
  GATE_MODES,
  formatGateReportHeader,
  isIllegal,
  nIllegal,
  readyForHard,
  runLegalityGate,
} from './debt-gate.mjs';

function entry(id, overrides = {}) {
  return {
    id,
    debtClass: 'legality',
    wellArchived: false,
    legalized: false,
    parked: false,
    parkedSince: null,
    ...overrides,
  };
}

const HEADER = {
  capturedAt: '2026-07-19T18:00:00.000Z',
  sourceRevision: 'cursor-2026-07-19T17:59:00.000Z',
};

test('isIllegal: ¬wellArchived ∧ ¬legalized; parked и легализованные — вне счёта', () => {
  assert.equal(isIllegal(entry('a')), true);
  assert.equal(isIllegal(entry('b', { wellArchived: true, debtClass: 'none' })), false);
  assert.equal(isIllegal(entry('c', { legalized: true })), false);
  assert.equal(isIllegal(entry('d', { parked: true, debtClass: 'owner-knowledge' })), false);
});

test('soft: нарушения есть → замечание, exit 0 (комната M4), работа не встаёт', () => {
  const { exitCode, report } = runLegalityGate({
    mode: 'soft',
    entries: [entry('a'), entry('b', { wellArchived: true, debtClass: 'none' })],
    snapshotHeader: HEADER,
  });
  assert.equal(exitCode, EXIT_CODES.OK);
  assert.equal(report.nIllegal, 1);
  assert.deepEqual(report.violations, [{ id: 'a', debtClass: 'legality' }]);
});

test('migrating: нарушения есть → exit 11 LEGALITY_MIGRATING (код назначен блоком, не комнатой)', () => {
  const { exitCode } = runLegalityGate({ mode: 'migrating', entries: [entry('a')] });
  assert.equal(exitCode, EXIT_CODES.LEGALITY_MIGRATING);
  assert.equal(exitCode, 11);
});

test('hard: нарушения есть → exit 21 (≠ 0 — комната M4); отказ отличим от замечания кодом', () => {
  const { exitCode } = runLegalityGate({ mode: 'hard', entries: [entry('a')] });
  assert.equal(exitCode, EXIT_CODES.LEGALITY_HARD);
  assert.notEqual(exitCode, EXIT_CODES.LEGALITY_MIGRATING);
  assert.notEqual(exitCode, 0);
});

test('во всех режимах чистый набор → exit 0', () => {
  for (const mode of GATE_MODES) {
    const { exitCode, report } = runLegalityGate({
      mode,
      entries: [entry('ok', { wellArchived: true, debtClass: 'none' }), entry('rubezh', { legalized: true })],
    });
    assert.equal(exitCode, EXIT_CODES.OK, mode);
    assert.equal(report.readyForHard, true);
  }
});

test('переключение migrating → hard по предикату N_illegal = 0, не по дате', () => {
  const dirty = [entry('a'), entry('b', { legalized: true })];
  assert.equal(nIllegal(dirty), 1);
  assert.equal(readyForHard(dirty), false);
  const legalizedAll = dirty.map((e) => ({ ...e, legalized: true }));
  assert.equal(readyForHard(legalizedAll), true);
});

test('258 легализованных рубежом → N_illegal = 0, hard проходим', () => {
  const entries = Array.from({ length: 258 }, (_, i) =>
    entry(`archived-pre-passport-${i}`, { legalized: true, debtClass: 'legality' }),
  );
  assert.equal(nIllegal(entries), 0);
  assert.equal(runLegalityGate({ mode: 'hard', entries }).exitCode, EXIT_CODES.OK);
});

test('parked не блокирует наступление hard (M4: не блокирует, из счётчиков исключён)', () => {
  const entries = [
    entry('db-h1b', { parked: true, parkedSince: '2026-07-19', debtClass: 'owner-knowledge' }),
    entry('ok', { wellArchived: true, debtClass: 'none' }),
  ];
  assert.equal(readyForHard(entries), true);
  assert.equal(runLegalityGate({ mode: 'hard', entries }).exitCode, EXIT_CODES.OK);
});

test('шапка отчёта видима: mode, N_illegal, дельта за прогон, provenance снимка, parked с датой', () => {
  const { report } = runLegalityGate({
    mode: 'migrating',
    entries: [
      entry('a'),
      entry('db-h1b', { parked: true, parkedSince: '2026-07-19', debtClass: 'owner-knowledge' }),
      entry('w', { debtClass: 'work' }),
    ],
    previousNIllegal: 5,
    snapshotHeader: HEADER,
  });
  assert.equal(report.mode, 'migrating');
  assert.equal(report.nIllegal, 2);
  assert.equal(report.delta, -3);
  assert.equal(report.openWork, 1);
  assert.deepEqual(report.provenance, HEADER);
  const text = formatGateReportHeader(report);
  assert.match(text, /режим: migrating/);
  assert.match(text, /N_illegal: 2 \(дельта за прогон: -3\)/);
  assert.match(text, /db-h1b с 2026-07-19/);
  assert.match(text, /sourceRevision=cursor-2026-07-19T17:59:00\.000Z/);
});

test('неизвестный режим — ошибка программиста, не молчаливый пропуск', () => {
  assert.throws(() => runLegalityGate({ mode: 'lenient', entries: [] }), /неизвестный режим/);
});

test('дельта без предыдущего прогона — null, не 0 (нет ложной «стабильности»)', () => {
  const { report } = runLegalityGate({ mode: 'soft', entries: [entry('a')] });
  assert.equal(report.delta, null);
  assert.doesNotMatch(formatGateReportHeader(report), /дельта/);
});
