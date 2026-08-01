import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCHIVE_CLASS,
  ARCHIVE_SOURCE,
  SUBJECT_TITLES,
  archiveDay,
  forecastText,
  forecastToArchiveRecord,
  forecastsToArchiveRecords,
  miss,
  outcomeObserved,
} from './forecast-to-archive.mjs';
import { recordProblems, parseArchive, appendMonotonic } from '../../persona-memory/lib/archive-schema.mjs';

/** Живой пример: промах тимлида по нарезке спринта 01.08. */
const CUT = Object.freeze({
  id: 'tarasov-2026-08-01-cut-dead-wire',
  personaId: 'tarasov',
  subject: 'cut',
  predictedAt: '2026-08-01T09:41:00+03:00',
  observedAt: '2026-08-01T10:06:00+03:00',
  ref: 'docs/sprint/cut/weekly-dead-wire-audit.json',
  predicted: Object.freeze({ changedLines: 650 }),
  observed: Object.freeze({ changedLines: 663 }),
  lesson: 'сумма угадана, плотный блок с зубами недооценён вдвое',
});

// ── отображение ──────────────────────────────────────────────────────────────

test('запись архива годна по живой схеме — recordProblems пуст', () => {
  assert.deepEqual(recordProblems(forecastToArchiveRecord(CUT)), []);
});

test('дискриминатор рода — class, форма текста — kind, и они не спорят', () => {
  const r = forecastToArchiveRecord(CUT);
  assert.equal(r.class, ARCHIVE_CLASS);
  assert.equal(r.kind, 'summary');
  assert.equal(r.source, ARCHIVE_SOURCE);
});

test('summary несёт указатель — иначе конспекта не существует (C1)', () => {
  const r = forecastToArchiveRecord(CUT);
  assert.equal(r.fullRef, CUT.ref);
  assert.equal(r.provenance, CUT.ref, 'провенанс — путь к источнику, а не имя провода');
});

test('ts — календарный день исхода, а не момент и не день предсказания', () => {
  assert.equal(forecastToArchiveRecord(CUT).ts, '2026-08-01');
  assert.equal(archiveDay('2026-08-09T23:59:59+03:00'), '2026-08-09');
  assert.throws(() => archiveDay('вчера'), /не дата/u);
});

test('predicted не пересекает границу адаптера — править в архиве нечего', () => {
  const r = forecastToArchiveRecord(CUT);
  assert.equal(r.predicted, undefined);
  assert.equal(r.observed, undefined);
  assert.ok(Object.isFrozen(CUT.predicted), 'исходное предсказание осталось замороженным');
});

// ── текст обязан учить ───────────────────────────────────────────────────────

test('текст несёт предсказанное, вышедшее и промах числом', () => {
  const t = forecastText(CUT);
  assert.match(t, /предсказал 650/u);
  assert.match(t, /вышло 663/u);
  assert.match(t, /промах \+13/u);
  assert.match(t, /\+2%/u);
});

test('текст читается по-русски: подвид в предложном падеже', () => {
  assert.match(forecastText(CUT), /о нарезке/u);
  assert.equal(SUBJECT_TITLES.stop, 'остановках');
});

test('разные дни моментов названы обоими', () => {
  const t = forecastText({ ...CUT, observedAt: '2026-08-09T10:00:00+03:00' });
  assert.match(t, /Предсказано 2026-08-01, исход 2026-08-09/u);
});

test('промах от нуля не выдумывает долю', () => {
  assert.deepEqual(miss(0, 5), { abs: 5, rel: null });
  assert.deepEqual(miss(200, 100), { abs: -100, rel: -50 });
});

// ── инварианты рода ──────────────────────────────────────────────────────────

test('исход не наступил — законное «нет», в архив не едет', () => {
  const open = { ...CUT, observedAt: undefined };
  assert.equal(outcomeObserved(open), false);
  assert.throws(() => forecastToArchiveRecord(open), /исход не наступил/u);
});

test('порядок моментов обязателен: предсказание раньше исхода', () => {
  const inverted = { ...CUT, predictedAt: '2026-08-02T10:00:00+03:00' };
  assert.throws(() => forecastToArchiveRecord(inverted), /порядок моментов нарушен/u);
});

test('порядок считается моментами, а не строками: смещения не обманывают', () => {
  // 07:00+00:00 позже, чем 09:00+03:00 (06:00Z) — лексикографически «07» < «09».
  const record = forecastToArchiveRecord({
    ...CUT,
    predictedAt: '2026-08-01T09:00:00+03:00',
    observedAt: '2026-08-01T07:00:00+00:00',
  });
  assert.equal(record.ts, '2026-08-01');
  // Обратный случай: одинаковый момент в разных зонах — порядка нет, значит отказ.
  assert.throws(
    () => forecastToArchiveRecord({
      ...CUT,
      predictedAt: '2026-08-01T09:00:00+03:00',
      observedAt: '2026-08-01T06:00:00+00:00',
    }),
    /порядок моментов нарушен/u,
  );
});

test('нечитаемый момент — ошибка входа, а не молчаливый пропуск', () => {
  assert.throws(
    () => forecastToArchiveRecord({ ...CUT, observedAt: '2026-08-01T99:99:99+03:00' }),
    /не разбирается|не дата/u,
  );
});

test('подвид вне закрытого множества — ошибка входа, а не «прочее»', () => {
  assert.throws(() => forecastToArchiveRecord({ ...CUT, subject: 'настроение' }), /вне закрытого множества/u);
});

test('запись без автора и без указателя не существует', () => {
  assert.throws(() => forecastToArchiveRecord({ ...CUT, personaId: '' }), /personaId/u);
  assert.throws(() => forecastToArchiveRecord({ ...CUT, ref: '' }), /ref обязателен/u);
});

// ── пачка ────────────────────────────────────────────────────────────────────

test('пачка: пропущенные считаны поимённо, молчаливого пропуска нет', () => {
  const { records, skipped } = forecastsToArchiveRecords([
    CUT,
    { ...CUT, id: 'открытый', observedAt: undefined },
  ]);
  assert.equal(records.length, 1);
  assert.deepEqual(skipped, [{ id: 'открытый', why: 'исход не наступил' }]);
});

// ── стык с живым архивом ─────────────────────────────────────────────────────

test('результат ложится в архив: parseArchive читает, appendMonotonic принимает', () => {
  const r = forecastToArchiveRecord(CUT);
  const parsed = parseArchive(JSON.stringify(r));
  // assert.ok(parsed) был бы молчаливым зелёным (B6): parseArchive всегда отдаёт объект
  // {records, problems}, и проверка истинности прошла бы даже на битой строке.
  assert.equal(parsed.records.length, 1, `разобрано ${parsed.records.length}`);
  assert.deepEqual(parsed.problems, [], 'разбор дал проблемы');
  assert.equal(parsed.records[0].class, 'forecast');
  assert.doesNotThrow(() => appendMonotonic([], r));
});
