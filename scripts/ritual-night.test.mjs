/**
 * Зубы ночной цепочки: РИТМ, ВЕРДИКТ и ГЕЙТ.
 *
 * Порча из DoD владельца («убрать ключ канала → preflight краснеет ДО запуска работы») проверена и
 * живьём: объявление канала было направлено в никуда, и прогон дал «ночь НЕ НАЧАЛАСЬ: … ни один шаг
 * не запускался», код 1. Зубы ниже держат ту же границу без запуска процессов.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NIGHT_CADENCES, nightVerdict, nightWords, planNight, stepDueOn } from './lib/ritual-night.mjs';

const DAILY = { id: 'network-probes', cadence: 'daily' };
const WEEKLY = { id: 'weekly-plan', cadence: 'weekly-monday' };
const MONDAY = 1;
const SATURDAY = 6;

test('ежедневный шаг идёт в любой день', () => {
  assert.equal(stepDueOn(DAILY, MONDAY), true);
  assert.equal(stepDueOn(DAILY, SATURDAY), true);
});

test('недельный шаг идёт ТОЛЬКО в понедельник — иначе план гнался бы каждые сутки', () => {
  assert.equal(stepDueOn(WEEKLY, MONDAY), true);
  assert.equal(stepDueOn(WEEKLY, SATURDAY), false);
});

test('ритм по умолчанию — ежедневный: шаг без cadence не пропадает молча', () => {
  assert.equal(stepDueOn({ id: 'x' }, SATURDAY), true);
});

test('НЕЗНАКОМЫЙ ритм — поломка манифеста, а не «наверное ежедневно»', () => {
  assert.throws(() => stepDueOn({ id: 'x', cadence: 'по-вторникам' }, MONDAY), /незнакомый ритм/u);
  assert.equal(NIGHT_CADENCES.includes('по-вторникам'), false);
});

test('отложенное ритмом НЕ прячется — оно в плане со словом причины', () => {
  const plan = planNight([DAILY, WEEKLY], { weekday: SATURDAY });
  assert.equal(plan.length, 2, 'из плана не должен пропасть ни один шаг');
  const weekly = plan.find((p) => p.step.id === 'weekly-plan');
  assert.equal(weekly.run, false);
  assert.match(weekly.why, /не сегодня/u);
});

test('--all перекрывает ритм: ручной прогон вправе позвать всё', () => {
  const plan = planNight([DAILY, WEEKLY], { weekday: SATURDAY, all: true });
  assert.equal(plan.every((p) => p.run), true);
});

test('--only сужает, и причина невыбора названа', () => {
  const plan = planNight([DAILY, WEEKLY], { weekday: MONDAY, only: new Set(['weekly-plan']) });
  assert.equal(plan.find((p) => p.step.id === 'network-probes').why, 'не выбран --only');
});

// ── ГЕЙТ: «не начиналась» ≠ «прошла пустой» ────────────────────────────────────────────────
test('ПОРЧА DoD: красный preflight останавливает ночь и это ОТДЕЛЬНОЕ событие', () => {
  const v = nightVerdict({ preflightOk: false });
  assert.equal(v.ok, false);
  assert.equal(v.stopped, 'preflight');
  assert.equal(v.exitCode, 1);
  assert.match(nightWords(v), /ни один шаг не запускался/u);
});

test('ночь без шагов, но с зелёным preflight — НЕ то же самое, что остановленная', () => {
  const v = nightVerdict({ preflightOk: true, statuses: [] });
  assert.equal(v.ok, true);
  assert.equal(v.stopped, null);
  assert.equal(v.exitCode, 0);
});

test('упавший критичный роняет прогон и назван поимённо', () => {
  const v = nightVerdict({ preflightOk: true, statuses: [
    { id: 'regression-container', status: 'failed-critical' },
    { id: 'network-probes', status: 'ok' },
  ] });
  assert.equal(v.ok, false);
  assert.deepEqual(v.failed, ['regression-container']);
  assert.match(nightWords(v), /regression-container/u);
});

test('упавший НЕкритичный — находка, а не провал: ночь не заложник моргнувшей сети', () => {
  const v = nightVerdict({ preflightOk: true, statuses: [
    { id: 'network-probes', status: 'skipped-noncritical' },
  ] });
  assert.equal(v.ok, true);
  assert.equal(v.exitCode, 0);
  assert.deepEqual(v.findings, ['network-probes']);
  assert.match(nightWords(v), /находки: network-probes/u);
});

test('молчания нет ни в одной ветке — слова есть у каждого исхода', () => {
  for (const v of [
    nightVerdict({ preflightOk: false }),
    nightVerdict({ preflightOk: true, statuses: [] }),
    nightVerdict({ preflightOk: true, statuses: [{ id: 'a', status: 'failed-critical' }] }),
  ]) {
    assert.ok(nightWords(v).trim().length > 0);
  }
});

// ── МАНИФЕСТ ЖИВОЙ, А НЕ ДВОЙНИК ──────────────────────────────────────────────────────────
// Вчерашний урок этого же спринта: зубы кормились самодельным двойником каталога, и расхождение
// формы прошло зелёным. Здесь читается НАСТОЯЩИЙ манифест шагов.
test('ФОРМА: настоящий манифест ночи несёт пятерых сирот с законными ритмами', async () => {
  const { readFileSync } = await import('node:fs');
  const doc = JSON.parse(readFileSync(new URL('../docs/tasks/night-ritual-steps.json', import.meta.url), 'utf8'));
  assert.equal(doc.steps.length, 5, 'пятеро сирот — полный перечень ночи');
  for (const s of doc.steps) {
    assert.ok(NIGHT_CADENCES.includes(s.cadence), `${s.id}: ритм «${s.cadence}» вне словаря`);
    assert.ok(typeof s.command === 'string' && s.command.length > 0, `${s.id}: нет команды`);
    assert.ok(typeof s.workflow === 'string', `${s.id}: не назван workflow, из которого шаг родом`);
  }
  // План на понедельник обязан звать всех пятерых: понедельник — единственный день, когда
  // сходятся оба ритма, и именно в него падал недельный план семнадцать раз подряд.
  assert.equal(planNight(doc.steps, { weekday: MONDAY }).every((p) => p.run), true);
});
