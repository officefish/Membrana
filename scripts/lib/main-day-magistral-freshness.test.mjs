/**
 * Зубы предиката свежести владельческого источника магистрали.
 *
 * Держат дефект, закрытый 02.08: расхождение вещдока дня с утренним гейтом предъявлялось
 * ИНСТРУКЦИЕЙ В ПРОМПТЕ генератора (норма У1, 31.07), то есть исполнялось языковой моделью,
 * и ничто не заметило бы, если однажды строка не будет написана. Состояние 02.08: sources[0]
 * от 30.07 (MFCC-ядро), гейт — subconscious-lift-c3 от 02.08.
 *
 * Прогон: `node --test scripts/lib/main-day-magistral-freshness.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  blocksDay,
  E_GATE_MALFORMED,
  E_SOURCES_MALFORMED,
  FRESHNESS,
  formatFreshness,
  magistralFreshness,
} from './main-day-magistral-freshness.mjs';

const TODAY = '2026-08-02';
const gate = (over = {}) => ({ magistral: 'subconscious-lift-c3', day: TODAY, ...over });
const src = (date, claim = 'магистраль') => ({ claim, origin: `owner-choice@${date}`, date });

// ── Расхождение ───────────────────────────────────────────────────────────────────────────

test('источник старше сегодняшнего гейта — gate_newer, обе даты в причине', () => {
  const r = magistralFreshness({ sources: [src('2026-07-30'), src('2026-07-29')] }, gate(), TODAY);

  assert.equal(r.verdict, FRESHNESS.GATE_NEWER);
  assert.ok(r.reason.includes('2026-07-30'), 'дата вещдока названа');
  assert.ok(r.reason.includes(TODAY), 'дата гейта названа');
  assert.ok(r.reason.includes('subconscious-lift-c3'), 'выбор гейта назван');
  assert.equal(r.sourceDate, '2026-07-30');
  assert.equal(r.gateDay, TODAY);
});

test('перечеканенный сегодня вещдок — aligned', () => {
  const r = magistralFreshness({ sources: [src(TODAY), src('2026-07-30')] }, gate(), TODAY);
  assert.equal(r.verdict, FRESHNESS.ALIGNED);
});

test('вчерашний источник с тем же именем магистрали расхождения НЕ снимает', () => {
  // Совпадение имён — не перечеканка: вещдок дня всё равно не обновлён, и следующий выбор
  // владельца снова разойдётся с ним молча.
  const r = magistralFreshness(
    { sources: [src('2026-08-01', 'subconscious-lift-c3')] },
    gate(),
    TODAY,
  );
  assert.equal(r.verdict, FRESHNESS.GATE_NEWER);
});

// ── Нечего сверять ────────────────────────────────────────────────────────────────────────

test('гейт вчерашний — no_gate: выбор не сегодняшний, расхождением не считается', () => {
  const r = magistralFreshness({ sources: [src('2026-07-30')] }, gate({ day: '2026-08-01' }), TODAY);
  assert.equal(r.verdict, FRESHNESS.NO_GATE);
  assert.ok(r.reason.includes('2026-08-01'));
});

test('гейта нет вовсе — no_gate, а не расхождение', () => {
  assert.equal(magistralFreshness({ sources: [src('2026-07-30')] }, null, TODAY).verdict, FRESHNESS.NO_GATE);
});

test('источников ноль — no_sources, и это НЕ то же, что aligned', () => {
  const r = magistralFreshness({ sources: [] }, gate(), TODAY);
  assert.equal(r.verdict, FRESHNESS.NO_SOURCES);
  assert.notEqual(r.verdict, FRESHNESS.ALIGNED);
  assert.ok(r.reason.includes('subconscious-lift-c3'));
});

test('поля sources нет вовсе — тоже no_sources, а не порча входа', () => {
  assert.equal(magistralFreshness({}, gate(), TODAY).verdict, FRESHNESS.NO_SOURCES);
});

// ── Порча входа ───────────────────────────────────────────────────────────────────────────

test('sources не список — отказ от вердикта, а не исход сверки', () => {
  const r = magistralFreshness({ sources: 'сломано' }, gate(), TODAY);
  assert.equal(r.verdict, E_SOURCES_MALFORMED);
  assert.ok(!Object.values(FRESHNESS).includes(r.verdict), 'порча входа вне закрытого списка исходов');
});

test('источник без даты не роняет предикат и не выдаёт себя за свежий', () => {
  const r = magistralFreshness({ sources: [{ claim: 'x', origin: 'y' }] }, gate(), TODAY);
  assert.equal(r.verdict, FRESHNESS.GATE_NEWER);
  assert.equal(r.sourceDate, null);
  assert.ok(r.reason.includes('без даты'));
});

// ── Что из этого следует ──────────────────────────────────────────────────────────────────

test('ни один исход сверки утро не роняет — красное за нарушением, не за наблюдением', () => {
  // Список зелёных перечислен ЯВНО, а не перебором Object.values(FRESHNESS). Разбор Дынина
  // 02.08: перебор по собственному словарю автоматически объявил бы зелёным и пятый исход,
  // если такой заведут, — то есть проштамповал бы решение вместо того, чтобы его потребовать.
  const GREEN = ['aligned', 'gate_newer', 'no_gate', 'no_sources'];
  for (const v of GREEN) {
    assert.equal(blocksDay(v), false, `${v} обязан оставаться зелёным (слово структурщика 02.08)`);
  }
  assert.deepEqual(
    Object.values(FRESHNESS).sort(),
    [...GREEN].sort(),
    'заведён новый исход — решить про него вручную, а не унаследовать зелёный',
  );
  assert.equal(blocksDay(E_SOURCES_MALFORMED), true, 'порча вещдока — нарушение, а не наблюдение');
  assert.equal(blocksDay(E_GATE_MALFORMED), false, 'чужая поломка день не роняет');
});

test('строка печатается на КАЖДОМ исходе — и на выходе ПРЕДИКАТА, а не на литералах словаря', () => {
  // Прежняя редакция гоняла formatFreshness по Object.values(FRESHNESS) и потому прошла бы на
  // предикате, который всегда возвращает aligned. Теперь исходы добываются настоящими входами.
  const cases = [
    [{ sources: [src(TODAY)] }, gate()],
    [{ sources: [src('2026-07-30')] }, gate()],
    [{ sources: [src('2026-07-30')] }, null],
    [{ sources: [] }, gate()],
  ];
  const seen = new Set();
  for (const [assertions, g] of cases) {
    const r = magistralFreshness(assertions, g, TODAY);
    seen.add(r.verdict);
    const line = formatFreshness(r);
    assert.ok(line.includes(r.verdict), 'вердикт назван в строке');
    assert.ok(line.includes(r.reason), 'причина названа в строке');
  }
  assert.equal(seen.size, 4, 'четыре разных входа дали четыре разных исхода');
});

test('пусто и там, и там: гейта нет И источников нет — ветвление закреплено', () => {
  // Порядок ветвей до сих пор держался честным словом реализации (замечание Дынина).
  // Гейт проверяется первым: сверять не с чем — более раннее утверждение, чем «источников нет».
  const r = magistralFreshness({ sources: [] }, null, TODAY);
  assert.equal(r.verdict, FRESHNESS.NO_GATE);
});

test('расхождение помечено знаком внимания, совпадение — нет', () => {
  assert.ok(formatFreshness({ verdict: FRESHNESS.GATE_NEWER, reason: 'r' }).startsWith('⚠'));
  assert.ok(!formatFreshness({ verdict: FRESHNESS.ALIGNED, reason: 'r' }).startsWith('⚠'));
});

test('список исходов сверки закрыт четырьмя', () => {
  assert.deepEqual(Object.values(FRESHNESS).sort(), ['aligned', 'gate_newer', 'no_gate', 'no_sources']);
});

// ── Формат дат: порча разделена по владельцу ──────────────────────────────────────────────

test('кривая дата источника — порча вещдока, и она роняет гейт', () => {
  // Разбор Дынина 02.08: «2026-8-2» прошёл бы как непустая строка и молча стёк бы в неверный
  // исход, потому что сравнение дат строковое.
  const r = magistralFreshness({ sources: [{ claim: 'x', date: '2026-8-2' }] }, gate(), TODAY);
  assert.equal(r.verdict, E_SOURCES_MALFORMED);
  assert.equal(blocksDay(r.verdict), true);
});

test('источник из будущего — сбитые часы чеканщика, а не «самый свежий»', () => {
  const r = magistralFreshness({ sources: [src('2026-09-01')] }, gate(), TODAY);
  assert.equal(r.verdict, E_SOURCES_MALFORMED);
  assert.ok(r.reason.includes('часы'));
});

test('кривой день гейта — порча ЧУЖАЯ: сверка не выносится, но день не роняется', () => {
  const r = magistralFreshness({ sources: [src('2026-07-30')] }, gate({ day: '02.08.2026' }), TODAY);
  assert.equal(r.verdict, E_GATE_MALFORMED);
  assert.equal(blocksDay(r.verdict), false, 'вещдок дня к поломке гейта непричастен');
});

test('отсутствие даты порчей не считается — это честное «не сказано»', () => {
  const r = magistralFreshness({ sources: [{ claim: 'x' }] }, gate(), TODAY);
  assert.equal(r.verdict, FRESHNESS.GATE_NEWER);
});
