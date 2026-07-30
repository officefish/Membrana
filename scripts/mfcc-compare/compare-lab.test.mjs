/**
 * Зубы сравнительного стенда. Проверяются не «функции работают», а свойства, на которых
 * стоит честность прогона: детерминизм по сиду, отсутствие утечки групп, легальное «нет»
 * вместо выдуманного числа и закрытый список вердиктов.
 *
 * Прогон: node --test scripts/mfcc-compare/compare-lab.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VERDICTS,
  aucOf,
  bootstrapAucCi,
  comparisonVerdict,
  corpusBias,
  diagDistance,
  discriminationVerdict,
  fitCentroidModel,
  groupLeak,
  groupOf,
  meanVector,
  mfccScore,
  overlapFraction,
  seededRng,
  splitByGroups,
} from './compare-lab.mjs';

const item = (id, truthDrone, vector) => ({ id, truthDrone, group: groupOf(id), vector: Float64Array.from(vector) });

/** Корпус: два «полёта» по три куска на класс — ровно тот случай, где утечка групп и живёт. */
function corpus() {
  const out = [];
  for (let flight = 0; flight < 6; flight++) {
    for (let part = 0; part < 3; part++) {
      const drone = flight % 2 === 0;
      const base = drone ? [4, 1] : [0, 1];
      out.push(item(`rec${flight}-00${part}`, drone, [base[0] + part * 0.1, base[1] - part * 0.05]));
    }
  }
  return out;
}

test('сид даёт воспроизводимый поток, разные сиды — разный', () => {
  const a = [...Array(5)].map(seededRng(7));
  const b = [...Array(5)].map(seededRng(7));
  const c = [...Array(5)].map(seededRng(8));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('группа собирает куски одной записи', () => {
  assert.equal(groupOf('drone-dad-0030'), groupOf('drone-dad-0031'));
  assert.notEqual(groupOf('drone-dad-0030'), groupOf('esc50-noise-0030'));
});

test('сплит по группам не пускает куски одного полёта по обе стороны', () => {
  const { train, test: held } = splitByGroups(corpus(), { seed: 7 });
  assert.deepEqual(groupLeak(train, held), []);
  assert.ok(train.length > 0 && held.length > 0);
});

test('сплит детерминирован по сиду', () => {
  const one = splitByGroups(corpus(), { seed: 7 }).testGroups;
  const two = splitByGroups(corpus(), { seed: 7 }).testGroups;
  assert.deepEqual(one, two);
});

test('центроидная модель отказывается с причиной, когда класс пуст', () => {
  const onlyDrones = corpus().filter((i) => i.truthDrone);
  const model = fitCentroidModel(onlyDrones);
  assert.equal(model.defined, false);
  assert.match(model.reason, /не-дронов 0/);
});

test('балл MFCC выше у того, кто ближе к центроиду дрона', () => {
  const model = fitCentroidModel(corpus());
  assert.equal(model.defined, true);
  const near = mfccScore(model, Float64Array.from([4, 1]));
  const far = mfccScore(model, Float64Array.from([0, 1]));
  assert.ok(near > far, `ожидал near > far, получил ${near} и ${far}`);
});

test('AUC не выдумывается на одноклассовом наборе — defined:false с причиной', () => {
  const single = [{ truthDrone: true, maxConfidence: 0.9 }];
  const result = aucOf(single);
  assert.equal(result.defined, false);
  assert.match(result.reason, /не-дронов 0/);
  assert.equal(bootstrapAucCi(single).defined, false);
});

test('интервал бутстрепа воспроизводим по сиду и накрывает точечную оценку', () => {
  const scored = corpus().map((i) => ({ truthDrone: i.truthDrone, maxConfidence: i.vector[0] }));
  const a = bootstrapAucCi(scored, { seed: 11, resamples: 200 });
  const b = bootstrapAucCi(scored, { seed: 11, resamples: 200 });
  assert.deepEqual([a.low, a.value, a.high], [b.low, b.value, b.high]);
  assert.ok(a.low <= a.value && a.value <= a.high);
});

test('предикат различения: случайный балл не объявляется различением', () => {
  const chance = [...Array(40)].map((_, n) => ({ truthDrone: n % 2 === 0, maxConfidence: (n % 4) / 4 }));
  const verdict = discriminationVerdict(bootstrapAucCi(chance, { seed: 11, resamples: 200 }));
  assert.equal(verdict.verdict, 'chance_not_excluded');
  assert.ok(VERDICTS.includes(verdict.verdict));
});

test('предикат различения: разделимый балл объявляется различением', () => {
  const clean = [...Array(40)].map((_, n) => ({ truthDrone: n < 20, maxConfidence: n < 20 ? 0.9 : 0.1 }));
  const verdict = discriminationVerdict(bootstrapAucCi(clean, { seed: 11, resamples: 200 }));
  assert.equal(verdict.verdict, 'mfcc_discriminates');
});

test('сравнение путей: без интервала — no_corpus, а не «ноль различий»', () => {
  const verdict = comparisonVerdict({ defined: false, reason: 'корпуса нет' }, { defined: true, value: 0.7, low: 0.6, high: 0.8 });
  assert.equal(verdict.verdict, 'no_corpus');
  assert.match(verdict.reason, /корпуса нет/);
});

test('сравнение путей: близкие AUC — паритет, далёкие — направленный вердикт', () => {
  const harmonic = { defined: true, value: 0.70, low: 0.60, high: 0.80 };
  assert.equal(comparisonVerdict({ defined: true, value: 0.72, low: 0.62, high: 0.82 }, harmonic).verdict, 'parity');
  assert.equal(comparisonVerdict({ defined: true, value: 0.95, low: 0.90, high: 1.0 }, harmonic).verdict, 'mfcc_better');
  assert.equal(comparisonVerdict({ defined: true, value: 0.50, low: 0.40, high: 0.60 }, harmonic).verdict, 'mfcc_worse');
});

test('конфаундер тракта: непересекающиеся источники и молчание манифеста считаются смещением', () => {
  assert.equal(corpusBias({ drone: ['a'], notDrone: ['b'] }).biased, true);
  assert.equal(corpusBias(null).biased, true);
  assert.match(corpusBias(null).reason, /не объявлены/);
  assert.equal(corpusBias({ drone: ['a', 'c'], notDrone: ['c'] }).biased, false);
});

test('направленный вердикт понижается до undecided_corpus_bias на смещённом наборе', () => {
  const harmonic = { defined: true, value: 0.50, low: 0.40, high: 0.60 };
  const mfcc = { defined: true, value: 0.94, low: 0.85, high: 1.0 };
  const biased = comparisonVerdict(mfcc, harmonic, { bias: corpusBias({ drone: ['a'], notDrone: ['b'] }) });
  assert.equal(biased.verdict, 'undecided_corpus_bias');
  assert.ok(VERDICTS.includes(biased.verdict));
  // Паритет смещением НЕ понижается: там нет направленного утверждения, которое могло бы соврать.
  const parity = comparisonVerdict({ defined: true, value: 0.52, low: 0.4, high: 0.6 }, harmonic, {
    bias: corpusBias({ drone: ['a'], notDrone: ['b'] }),
  });
  assert.equal(parity.verdict, 'parity');
  assert.equal(comparisonVerdict(mfcc, harmonic, { bias: corpusBias({ drone: ['a'], notDrone: ['a'] }) }).verdict, 'mfcc_better');
});

test('перекрытие интервалов: непересекающиеся дают ноль, вложенные — единицу', () => {
  const a = { defined: true, low: 0.1, high: 0.2 };
  const b = { defined: true, low: 0.8, high: 0.9 };
  assert.equal(overlapFraction(a, b).value, 0);
  assert.equal(overlapFraction(a, { defined: true, low: 0.0, high: 1.0 }).value, 1);
});

test('среднее и расстояние считаются покомпонентно, пустой набор — null', () => {
  assert.equal(meanVector([]), null);
  assert.deepEqual([...meanVector([Float64Array.from([0, 2]), Float64Array.from([2, 4])])], [1, 3]);
  const d = diagDistance(Float64Array.from([2, 0]), Float64Array.from([0, 0]), Float64Array.from([1, 1]));
  assert.equal(d, 2);
});
