/**
 * Зубы обвязки тембрового детектора в измерителе (`mfcc` шестым в общей таблице).
 *
 * ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ И ПОЧЕМУ ИМЕННО ЭТО. Прогон по корпусу зубом не покрывается — он
 * читает звук и стоит минуты. Покрыт разбор ПРЕСЕТА: именно там живут ошибки, которые не
 * падают, а врут. Пресет с чужим отпечатком, коридоры не той длины, судимый номер вне вектора,
 * ворота, снятые на том же корпусе, по которому идёт прогон, — каждая из них даёт число,
 * выглядящее нормальным.
 *
 * Разбор аргумента `--mfcc-strictness` покрыт тем же приёмом, что и `--config` у соседей:
 * закрытый список, чужое значение отвергается, а не подставляется молча.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs } from './benchmark-detectors.mjs';
import {
  MFCC_DEFAULT_STRICTNESS,
  MFCC_STRICTNESS_LEVELS,
  mfccConfigFromHash,
  mfccPipeSpec,
  mfccPresetProblem,
  mfccSelfMeasurement,
  mfccVectorsOf,
} from './lib/mfcc-benchmark.mjs';

/** Пресет-образец: форма боевого, но всего три коэффициента — читаемо в проверках. */
const preset = () => ({
  configHash: 'mel8-c3-buf2048-sr48000',
  bounds: [
    { min: 100, max: 200 },
    { min: -10, max: 10 },
    { min: -5, max: 5 },
  ],
  judgedCoefficients: [0, 1],
  strictness: {
    easy: { minInBandRatio: 0.5, minPassRate: 0.3 },
    normal: { minInBandRatio: 0.5, minPassRate: 0.6 },
    strict: { minInBandRatio: 1, minPassRate: 0.9 },
  },
  minMagnitude: 0,
});

test('отпечаток разбирается на четыре несущие настройки', () => {
  assert.deepEqual(mfccConfigFromHash('mel40-c24-buf4096-sr48000'), {
    melBands: 40,
    numberOfCoefficients: 24,
    bufferSize: 4096,
    sampleRate: 48_000,
  });
});

test('отпечаток без частоты отвергается — «не знаем» не притворяется «48 000»', () => {
  // Ровно та форма, что лежала в отчёте калибровки до 16.08: длина вектора совпадает,
  // а банк мел-фильтров построен от другой частоты, и поймать это больше нечем.
  assert.equal(mfccConfigFromHash('mel40-c24-buf4096'), null);
  assert.equal(mfccConfigFromHash(''), null);
  assert.equal(mfccConfigFromHash(undefined), null);
});

test('годный пресет проблем не имеет — ни по одному уровню, ни по названному', () => {
  assert.equal(mfccPresetProblem(preset()), null);
  for (const level of MFCC_STRICTNESS_LEVELS) {
    assert.equal(mfccPresetProblem(preset(), level), null);
  }
});

test('коридоров не столько, сколько коэффициентов по отпечатку — отказ с обоими числами', () => {
  const p = preset();
  p.bounds = p.bounds.slice(0, 2);
  const problem = mfccPresetProblem(p);
  assert.match(problem, /коридоров 2 ≠ коэффициентов 3/u);
});

test('судимый номер вне вектора — отказ, а не тихий undefined в коридоре', () => {
  const p = preset();
  p.judgedCoefficients = [0, 7];
  assert.match(mfccPresetProblem(p), /номер 7 вне \[0, 2\]/u);
});

test('пустой список судимых — «судить нечем», а не «все»', () => {
  const p = preset();
  p.judgedCoefficients = [];
  assert.match(mfccPresetProblem(p), /judgedCoefficients пуст/u);
});

test('вывернутый коридор и неконечные границы отвергаются', () => {
  const inverted = preset();
  inverted.bounds[1] = { min: 10, max: -10 };
  assert.match(mfccPresetProblem(inverted), /коридор 1: min=10 > max=-10/u);

  const infinite = preset();
  infinite.bounds[2] = { min: -Infinity, max: 5 };
  assert.match(mfccPresetProblem(infinite), /коридор 2: границы не конечны/u);
});

test('порог, не являющийся долей, отвергается по имени уровня', () => {
  const p = preset();
  p.strictness.strict.minPassRate = 1.4;
  assert.equal(mfccPresetProblem(p, 'normal'), null, 'чужой уровень не проверяется зря');
  assert.match(mfccPresetProblem(p, 'strict'), /уровень «strict»: minPassRate=1\.4/u);
});

test('уровень строгости вне закрытого списка отвергается', () => {
  assert.match(mfccPresetProblem(preset(), 'medium'), /«medium» — не из easy\|normal\|strict/u);
});

test('спека судьи собирается из пары порогов названного уровня', () => {
  const p = preset();
  assert.deepEqual(mfccPipeSpec(p, 'strict'), {
    bounds: p.bounds,
    configHash: 'mel8-c3-buf2048-sr48000',
    minInBandRatio: 1,
    minPassRate: 0.9,
    minMagnitude: 0,
    judgedCoefficients: [0, 1],
  });
});

test('спека по негодному пресету не собирается — бросок, а не умолчание', () => {
  const p = preset();
  p.configHash = 'mel8-c3-buf2048';
  assert.throws(() => mfccPipeSpec(p, 'normal'), /не разбирается/u);
  assert.throws(() => mfccPipeSpec(preset(), 'medium'), /не из easy\|normal\|strict/u);
});

test('векторы несут ПРЕСЕТНЫЙ отпечаток и строго растущий адрес кадра', () => {
  const vectors = mfccVectorsOf(
    [
      { startIndex: 0, coefficients: [1, 2, 3] },
      { startIndex: 2048, coefficients: [4, 5, 6] },
    ],
    'mel8-c3-buf2048-sr48000',
  );
  assert.equal(vectors.length, 2);
  assert.ok(vectors[0].coefficients instanceof Float32Array);
  assert.deepEqual([...vectors[1].coefficients], [4, 5, 6]);
  assert.equal(vectors[0].windowStartIndex, 0);
  assert.equal(vectors[1].windowStartIndex, 2048);
  // Отпечаток именно пресетный: ядро частоту в свой не берёт, и подмена здесь означала бы
  // отказ судьи на живом прогоне либо, хуже, вердикт по несравнимым числам.
  assert.equal(vectors[0].configHash, 'mel8-c3-buf2048-sr48000');
});

test('самозамер узнаётся по корпусу ворот, разделители не мешают', () => {
  const self = mfccSelfMeasurement(
    'data/detectors-benchmark/v0.2',
    'C:\\repo\\data\\detectors-benchmark\\v0.2',
  );
  assert.equal(self.self, true);
  assert.match(self.reason, /ЭТОМ же корпусе/u);

  const other = mfccSelfMeasurement(
    'data/detectors-benchmark/v0.2',
    '/repo/data/detectors-benchmark/vdr-hard-gate-pilot',
  );
  assert.equal(other.self, false);
  assert.match(other.reason, /по другому корпусу/u);
});

test('корпус ворот не назван — это НЕ «сняты на другом»', () => {
  const unknown = mfccSelfMeasurement(null, '/repo/data/detectors-benchmark/v0.2');
  assert.equal(unknown.self, false);
  assert.match(unknown.reason, /не назван/u);
});

test('строгость по умолчанию — рабочая точка прибора', () => {
  assert.equal(MFCC_DEFAULT_STRICTNESS, 'normal');
  assert.equal(parseArgs([]).mfccStrictness, 'normal');
  assert.equal(parseArgs(['--mfcc-strictness', 'strict']).mfccStrictness, 'strict');
});

test('чужой уровень в аргументе роняет прогон, а не подставляет умолчание', () => {
  assert.throws(
    () => parseArgs(['--mfcc-strictness', 'medium']),
    /--mfcc-strictness принимает easy\|normal\|strict/u,
  );
});

test('прогон по не-каноническому манифесту канонический MD не патчит', () => {
  // Соседний инвариант, задетый новым аргументом: разбор аргументов один на всех, и новая
  // ветка не имеет права сдвинуть признак канонического прогона.
  assert.equal(parseArgs(['--mfcc-strictness', 'easy']).isCanonicalRun, true);
  assert.equal(parseArgs(['--origin-labels']).isCanonicalRun, false);
});
