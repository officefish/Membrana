/**
 * Метрики, не зависящие от классового состава корпуса.
 *
 * Повод: precision смешивает классы, и цифра без указания приора не имеет
 * одного смысла. Тест-сплит мы выбираем сами, а боевой поток (плагин микрофона
 * в постоянном слушании) кратно более no-drone-тяжёлый, чем любой стенд.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  averagePrecision,
  detectorMetrics,
  falseAlarmRate,
  precisionAtPrior,
  precisionByPrior,
  rocAuc,
  wilsonInterval,
} from './lib/benchmark-metrics.mjs';

const scored = (pairs) =>
  pairs.map(([truthDrone, maxConfidence], i) => ({
    id: `s${i}`,
    truthDrone,
    predDrone: maxConfidence >= 0.5,
    maxConfidence,
  }));

test('P_fa считается только по негативам', () => {
  assert.equal(falseAlarmRate(15, 85), 0.15);
  assert.equal(falseAlarmRate(0, 10), 0);
  assert.equal(falseAlarmRate(0, 0), null, 'без негативов величины не существует');
});

test('precision при фиксированных P_d/P_fa падает с ростом доли негативов', () => {
  const pd = 0.9;
  const pfa = 0.15;
  // Ровно тот счёт, которым аудит вскрыл подмену на заседании: порог 0.15
  // эквивалентен precision 85% ТОЛЬКО на балансе 1:1.
  assert.ok(Math.abs(precisionAtPrior(pd, pfa, 1 / 2) - 0.857) < 0.001, '1:1');
  assert.ok(Math.abs(precisionAtPrior(pd, pfa, 1 / 11) - 0.375) < 0.001, '1:10');
  assert.ok(Math.abs(precisionAtPrior(pd, pfa, 1 / 101) - 0.057) < 0.001, '1:100');
  // Доля 0.1 — это 1:9, а не 1:10: на такой мелочи подменяется смысл цифры.
  assert.ok(Math.abs(precisionAtPrior(pd, pfa, 0.1) - 0.4) < 0.001, '1:9 ≠ 1:10');
});

test('P_d и P_fa не зависят от состава, precision зависит', () => {
  // Один и тот же детектор, две выборки с разным балансом.
  const balanced = detectorMetrics(
    scored([
      [true, 0.9], [true, 0.9], [true, 0.1],
      [false, 0.9], [false, 0.1], [false, 0.1],
    ]),
    [1],
  );
  const negativeHeavy = detectorMetrics(
    scored([
      [true, 0.9], [true, 0.9], [true, 0.1],
      [false, 0.9], [false, 0.1], [false, 0.1],
      [false, 0.9], [false, 0.1], [false, 0.1],
      [false, 0.9], [false, 0.1], [false, 0.1],
    ]),
    [1],
  );

  assert.equal(balanced.pd, negativeHeavy.pd, 'P_d класс-условна');
  assert.equal(balanced.pfa, negativeHeavy.pfa, 'P_fa класс-условна');
  assert.ok(
    negativeHeavy.precision < balanced.precision,
    'precision обязана просесть при росте доли негативов',
  );
});

test('кривая приора отдаёт ряд до 1:1000 и не назначает рабочую точку', () => {
  const curve = precisionByPrior(0.9, 0.15);
  assert.deepEqual(
    curve.map((p) => p.ratio),
    ['1:1', '1:10', '1:100', '1:1000'],
  );
  assert.ok(Math.abs(curve[1].precision - 0.375) < 0.001, 'счёт аудита воспроизводится');
  assert.ok(curve[0].precision > curve[3].precision);
});

test('ROC-AUC: идеальное разделение = 1, случайное = 0.5, совпадения делятся', () => {
  assert.equal(rocAuc(scored([[true, 0.9], [true, 0.8], [false, 0.2], [false, 0.1]])), 1);
  assert.equal(rocAuc(scored([[true, 0.5], [false, 0.5]])), 0.5, 'ничья = 0.5');
  assert.equal(rocAuc(scored([[true, 0.1], [false, 0.9]])), 0, 'полная инверсия');
  assert.equal(rocAuc(scored([[true, 0.9]])), null, 'без обоих классов не определена');
});

test('ROC-AUC приор-независима, PR-AUC — нет', () => {
  // Ранжирование намеренно НЕ идеальное: негатив стоит выше позитива. При
  // идеальном разделении AP равна 1 при любом балансе, и разница не видна.
  const base = [[true, 0.5], [false, 0.6]];
  const extraNegatives = [...base, [false, 0.6], [false, 0.6], [false, 0.6]];

  // Каждый добавленный негатив бьёт позитив ровно так же — доля пар неизменна.
  assert.equal(rocAuc(scored(base)), 0);
  assert.equal(rocAuc(scored(extraNegatives)), 0, 'ROC-AUC не сдвинулась от баланса');

  assert.equal(averagePrecision(scored(base)), 0.5);
  assert.equal(
    averagePrecision(scored(extraNegatives)),
    0.2,
    'PR-AUC зависит от баланса — потому едет в отчёт вместе с ним',
  );
});

test('average precision: идеальное ранжирование = 1', () => {
  assert.equal(averagePrecision(scored([[true, 0.9], [true, 0.8], [false, 0.2]])), 1);
  assert.equal(averagePrecision(scored([[false, 0.9], [false, 0.8]])), null, 'без позитивов нет');
});

test('интервал Уилсона не вылезает за [0,1] на краях', () => {
  const all = wilsonInterval(10, 10);
  assert.ok(all.high <= 1 && all.low > 0.5);
  const none = wilsonInterval(0, 10);
  assert.ok(none.low >= 0 && none.high < 0.5);
  assert.equal(wilsonInterval(0, 0), null);
  // Малая выборка обязана давать широкий интервал — иначе цифре нельзя верить.
  const small = wilsonInterval(9, 10);
  const large = wilsonInterval(900, 1000);
  assert.ok(small.high - small.low > large.high - large.low);
});

test('detectorMetrics отдаёт и старые поля, и приор-независимые', () => {
  const m = detectorMetrics(scored([[true, 0.9], [false, 0.1]]), [1, 2, 3]);
  for (const key of ['tp', 'fp', 'fn', 'tn', 'precision', 'recall', 'f1', 'latencyP50Ms']) {
    assert.ok(key in m, `старое поле ${key} обязано сохраниться`);
  }
  for (const key of ['pd', 'pfa', 'pdCI', 'pfaCI', 'rocAuc', 'prAuc', 'precisionByPrior']) {
    assert.ok(key in m, `новое поле ${key} обязано появиться`);
  }
  assert.equal(m.pd, m.recall, 'P_d и есть recall — разные имена одной величины');
});
