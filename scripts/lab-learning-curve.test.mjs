import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  INTERVAL_METHOD,
  LADDER_REPORT_SCHEMA,
  buildLadderReport,
  canonicalJson,
  ladderStep,
} from './lib/ladder-report.mjs';
// Форма интервала берётся у САМОЙ библиотеки метрик, а не выдумывается фикстурой:
// первая редакция зуба подавала кортеж, а wilsonInterval отдаёт {low, high} — тест
// проверял собственную выдумку и пропустил бы расхождение с витриной (находка 06.08).
import { wilsonInterval } from './lib/benchmark-metrics.mjs';

// Зубы формы отчёта лестницы (блок g1, Ф2). Корпус и wav не нужны: ядро чистое, прогон
// приносит посчитанные метрики значением. Первым покрыт инвариант знаменателей — именно
// то молчаливое смещение, ради которого стенд и переводится с печати на JSON (Дынин 06.08).

const metrics = ({ tp = 18, fp = 4, fn = 6, tn = 20, rocAuc = 0.81 } = {}) => ({
  tp, fp, fn, tn,
  pdCI: wilsonInterval(tp, tp + fn),
  pfaCI: wilsonInterval(fp, fp + tn),
  rocAuc,
});

const step = (n, over = {}) =>
  ladderStep({
    nTrainDrones: n,
    nTrainTotal: n * 2,
    method: 'percentile',
    params: { minConfidence: 50, withCompetitors: true },
    metrics: metrics(over),
  });

const REPORT_INPUT = {
  generatedAt: '2026-08-06T09:30:00.000Z',
  corpus: { path: 'data/detectors-benchmark/v0.2', droneCount: 63, cleanCount: 74, manifestSha256: 'abc123' },
  test: { size: 48, drones: 24, groups: 9 },
};

test('ступень несёт ШТУКИ и знаменатели, а не одни доли', () => {
  const s = step(20);
  assert.equal(s.test.detected, 18);
  assert.equal(s.test.dronesTotal, 24, 'tp + fn');
  assert.equal(s.test.falseAlarms, 4);
  assert.equal(s.test.cleanTotal, 24, 'fp + tn');
});

test('интервал несёт МЕТОД, рабочая точка обязательна — иначе pd/pfa не восстановимы', () => {
  const s = step(20);
  assert.equal(s.test.intervalMethod, INTERVAL_METHOD);
  // Кортеж, а не {low, high}: витрина Ф1 говорит кортежем, отчёт обязан говорить так же.
  const expected = wilsonInterval(18, 24);
  assert.deepEqual(s.test.pdInterval, [expected.low, expected.high]);
  assert.ok(Array.isArray(s.test.pdInterval), 'форма — кортеж, иначе потребитель не прочтёт');
  assert.equal(s.params.threshold, 50, 'порог — не «параметр вообще», а рабочая точка');
  assert.equal(s.params.withCompetitors, true);
});

test('rocAucCi = null говорит «не мерено», а не «ноль»', () => {
  const s = step(20);
  assert.equal(s.test.rocAuc, 0.81);
  assert.equal(s.test.rocAucCi, null);
});

test('отчёт собирается: схема, провенанс корпуса, правило отбора названо', () => {
  const r = buildLadderReport({ ...REPORT_INPUT, steps: [step(20), step(40), step(60)] });
  assert.equal(r.schema, LADDER_REPORT_SCHEMA);
  assert.equal(r.corpus.manifestSha256, 'abc123');
  assert.equal(r.selection.split, 'train', 'победитель определяется на обучающей части, не на тесте');
  assert.equal(r.steps.length, 3);
  assert.deepEqual(r.steps.map((s) => s.nTrainDrones), [20, 40, 60], 'ступени монотонны');
});

test('ЗНАМЕНАТЕЛИ ТЕСТА НЕПОДВИЖНЫ: расхождение — отказ, а не результат', () => {
  const skewed = step(40, { tp: 10, fn: 2 }); // дронов в тесте вдруг 12, а не 24
  assert.throws(
    () => buildLadderReport({ ...REPORT_INPUT, steps: [step(20), skewed] }),
    /знаменатели теста разошлись/u,
  );
});

test('интервал Уилсона валиден: lo ≤ pd ≤ hi и обе границы в [0,1]', () => {
  const s = step(20);
  const pd = s.test.detected / s.test.dronesTotal;
  const [lo, hi] = s.test.pdInterval;
  assert.ok(lo >= 0 && hi <= 1, 'границы вне [0,1] — интервал не про долю');
  assert.ok(lo <= pd && pd <= hi, 'точка обязана лежать внутри своего интервала');
});

test('canonicalJson: порядок ключей не влияет на хеш-строку', () => {
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 4, c: 3 }] }), canonicalJson({ a: [2, { c: 3, d: 4 }], b: 1 }));
  assert.equal(canonicalJson({ a: 1 }), '{"a":1}', 'без пробелов — иначе хеш зависит от форматирования');
});
