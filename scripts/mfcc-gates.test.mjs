/**
 * Зубы калибровки ворот тембрового детектора (спутник `scripts/lib/mfcc-gates.mjs`,
 * правило M8: тест наследует дом предмета). Заведены по ревью 31.07: граничные случаи на
 * живом корпусе — норма, а не редкость.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coefficientGate, frames, percentile } from './lib/mfcc-gates.mjs';

test('percentile: пустой вход даёт null, а не NaN', () => {
  // NaN протекает дальше молча и всплывает в отчёте числом, которого никто не считал.
  assert.equal(percentile([], 50), null);
  assert.equal(percentile(null, 50), null);
  assert.equal(percentile([1, 2, 3], Number.NaN), null);
});

test('percentile: края и середина', () => {
  const s = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.equal(percentile(s, 0), 0);
  assert.equal(percentile(s, 100), 9);
  assert.equal(percentile(s, 50), 5);
  assert.equal(percentile(s, -10), 0, 'выход за диапазон зажимается, а не падает');
  assert.equal(percentile(s, 999), 9);
});

test('frames: хвост короче кадра отбрасывается', () => {
  // Неполный кадр дал бы вектор на другом числе сэмплов — несравнимый с остальными.
  const s = new Float32Array(10);
  assert.equal([...frames(s, 4)].length, 2, '10 сэмплов по 4 → два кадра, два сэмпла в хвосте');
  assert.equal([...frames(s, 10)].length, 1);
  assert.equal([...frames(s, 11)].length, 0, 'кадр длиннее сигнала — ни одного кадра');
});

test('frames: негодный вход не падает и не выдумывает кадров', () => {
  assert.equal([...frames(null, 4)].length, 0);
  assert.equal([...frames(new Float32Array(8), 1)].length, 0, 'кадр < 2 сэмплов бессмыслен');
  assert.equal([...frames(new Float32Array(8), 2.5)].length, 0, 'дробный размер кадра — отказ');
});

test('coefficientGate: на ДОСТАТОЧНОЙ выборке выброс ворота не раздвигает', () => {
  // Ровно ради этого ворота берутся перцентилями, а не крайними значениями.
  const drone = [...Array.from({ length: 99 }, () => 10), 1000];
  const g = coefficientGate(drone, [500, 600]);
  assert.ok(g.gate.hi < 1000, `выброс 1000 не должен попасть в ворота, верх = ${g.gate.hi}`);
  assert.equal(g.otherInside, 0, 'фон вне ворот');
  assert.ok(g.separation > 0.8);
});

test('ГРАНИЦА: на малой выборке перцентиль вырождается в мин-макс', () => {
  // Найдено этим же зубом 31.07 при первом прогоне. На десяти значениях индекс 95-го
  // перцентиля округляется к последнему элементу — защиты от выброса НЕТ.
  //
  // Записано как свойство, а не подогнано ожиданием: в боевом прогоне кадров тысячи и
  // защита работает, но коэффициент с редкими валидными значениями получит ворота по
  // крайним точкам, и об этом надо знать, а не узнавать из странного отчёта.
  const drone = [10, 10, 10, 10, 10, 10, 10, 10, 10, 1000];
  const g = coefficientGate(drone, [500, 600]);
  assert.equal(g.gate.hi, 1000, 'на n=10 верхние ворота садятся на сам выброс');
});

test('coefficientGate: пустой класс фона даёт null, а НЕ ноль', () => {
  // «Фон не попадает ни разу» и «фона не было» — разные вещи; слить их значит соврать
  // в пользу коэффициента.
  const g = coefficientGate([1, 2, 3], []);
  assert.equal(g.separation, null);
  assert.equal(g.otherInside, null);
  assert.match(g.why, /фона пуст/u);
  assert.notEqual(g.separation, 0);
});

test('coefficientGate: пустой класс цели — отказ с причиной', () => {
  const g = coefficientGate([], [1, 2, 3]);
  assert.equal(g.gate, null);
  assert.match(g.why, /цели пуст/u);
});

test('coefficientGate: NaN и бесконечности отсеиваются, а не портят ворота', () => {
  const g = coefficientGate([1, 2, Number.NaN, 3, Infinity], [10, Number.NaN, 11]);
  assert.ok(Number.isFinite(g.gate.lo) && Number.isFinite(g.gate.hi));
  assert.ok(Number.isFinite(g.separation));
});

test('coefficientGate: полное совпадение классов даёт разделение около нуля', () => {
  // Честный отрицательный исход: коэффициент, который ничего не различает, обязан
  // показывать это числом, а не отсутствием записи.
  const same = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const g = coefficientGate(same, [...same]);
  assert.ok(Math.abs(g.separation) < 0.01, `ожидалось ~0, вышло ${g.separation}`);
});
