import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  normalize,
  hashToken,
  simhash,
  hashConspectus,
  popcount64,
  hammingDistance,
  kEff,
  isBreath,
  step,
  initialState,
  sevenBreaths,
  KMIN_MANDATE,
  BREATH_CEILING,
  MASK64,
} from './lib/storm-breath.mjs';

// ── SimHash / нормализация ────────────────────────────────────────────────

test('simhash детерминизм: те же токены → тот же хеш', () => {
  const tokens = ['дрон', 'над', 'полем', 'слышен'];
  assert.equal(simhash(tokens), simhash([...tokens]), 'повтор даёт тот же хеш');
  assert.equal(typeof simhash(tokens), 'bigint');
  // порядок токенов НЕ влияет на SimHash (сумма коммутативна) — это свойство меры
  const shuffled = ['слышен', 'дрон', 'полем', 'над'];
  assert.equal(simhash(tokens), simhash(shuffled), 'SimHash не зависит от порядка');
});

test('simhash: пустой вход → 0n', () => {
  assert.equal(simhash([]), 0n);
  assert.equal(simhash(normalize('   .,;!  ')), 0n, 'только пунктуация → пусто → 0n');
  assert.equal(hashConspectus(''), 0n);
});

test('hashToken: FNV-1a детерминирован и различает по существу', () => {
  assert.equal(hashToken('дрон'), hashToken('дрон'));
  assert.notEqual(hashToken('дрон'), hashToken('дрона'), 'разные токены — разный хеш');
  // якорь канона FNV-1a: пустая строка → базовое смещение
  assert.equal(hashToken(''), 14695981039346656037n);
});

test('normalize косметика → те же токены → d=0 (вдох-пустышка НЕ проходит)', () => {
  const base = 'Дрон над полем. Слышен гул.';
  const cosmetic = '  дрон,   НАД   ПОЛЕМ!!!  слышен... гул   ';
  assert.deepEqual(normalize(base), normalize(cosmetic), 'косметика даёт те же токены');
  const refHash = hashConspectus(base);
  const curHash = hashConspectus(cosmetic);
  assert.equal(hammingDistance(refHash, curHash), 0, 'косметика → d=0');
  // при мандате K_min=1 (порог 1) косметика всё равно НЕ вдох
  assert.equal(isBreath(refHash, curHash, 1), false, 'вдох-пустышка не проходит');
});

test('normalize по существу → d>0 (реальное изменение движет хеш)', () => {
  const refHash = hashConspectus('Дрон над полем, слышен гул.');
  const curHash = hashConspectus('Дрон над полем, слышен гул, и второй дрон восточнее.');
  assert.ok(hammingDistance(refHash, curHash) > 0, 'изменение по существу → d>0');
});

test('popcount64 и hammingDistance: базовые тождества', () => {
  assert.equal(popcount64(0n), 0);
  assert.equal(popcount64(0b1011n), 3);
  assert.equal(popcount64(MASK64), 64, 'все 64 бита');
  assert.equal(hammingDistance(0n, 0n), 0);
  assert.equal(hammingDistance(0b1010n, 0b0110n), 2, 'два различных бита');
  assert.equal(hammingDistance(0n, MASK64), 64);
});

// ── K_эфф: границы, монотонность, инварианты ──────────────────────────────

test('kEff границы: a=0 → K0, a→большое → Kmin, всегда ∈ [Kmin, K0]', () => {
  const p = { K0: 10, Kmin: 2, c: 4 };
  assert.equal(kEff({ ...p, a: 0 }), 10, 'a=0 → K0');
  assert.equal(kEff({ ...p, a: 1_000_000 }), 2, 'a→большое → Kmin');
  // при a=c смягчение половинное: Kmin + floor((K0-Kmin)/2) = 2 + floor(8/2) = 6
  assert.equal(kEff({ ...p, a: 4 }), 6, 'a=c → половинное смягчение');
  for (let a = 0; a <= 500; a += 1) {
    const v = kEff({ ...p, a });
    assert.ok(v >= p.Kmin && v <= p.K0, `kEff(${a})=${v} ∈ [${p.Kmin}, ${p.K0}]`);
  }
});

test('kEff монотонно НЕ ВОЗРАСТАЕТ по a (перебор)', () => {
  const p = { K0: 17, Kmin: 3, c: 7 };
  let prev = Infinity;
  for (let a = 0; a <= 1000; a += 1) {
    const v = kEff({ ...p, a });
    assert.ok(v <= prev, `kEff(${a})=${v} не больше предыдущего ${prev}`);
    prev = v;
  }
});

test('kEff инварианты бросают Error: K0<Kmin, Kmin<1, c<=0, a<0', () => {
  assert.throws(() => kEff({ K0: 3, Kmin: 5, c: 2, a: 0 }), /K0 ≥ K_min/, 'K0<Kmin');
  assert.throws(() => kEff({ K0: 5, Kmin: 0, c: 2, a: 0 }), /K_min ≥ 1/, 'Kmin<1');
  assert.throws(() => kEff({ K0: 5, Kmin: 1, c: 0, a: 0 }), /c > 0/, 'c=0');
  assert.throws(() => kEff({ K0: 5, Kmin: 1, c: -1, a: 0 }), /c > 0/, 'c<0');
  assert.throws(() => kEff({ K0: 5, Kmin: 1, c: 2, a: -1 }), /a ≥ 0/, 'a<0');
});

// ── Мандат K_min = 1 ──────────────────────────────────────────────────────

test('KMIN_MANDATE=1: при пороге=1 любое существенное событие (d≥1) есть вдох', () => {
  assert.equal(KMIN_MANDATE, 1, 'мандат ратифицирован владельцем');
  // Мандат держится, когда K_эфф опускается до 1. Крайняя realization —
  // K0=K_min=1: порог тождественно 1 при любом a → любой d≥1 есть вдох.
  const p = { K0: 1, Kmin: KMIN_MANDATE, c: 3 };
  for (let a = 0; a <= 200; a += 1) {
    assert.equal(kEff({ ...p, a }), 1, `порог тождественно 1 при a=${a}`);
  }
  const refHash = hashConspectus('Дрон над полем.');
  const curHash = hashConspectus('Дрон над полем, слышен гул восточнее.');
  const d = hammingDistance(refHash, curHash);
  assert.ok(d >= 1, 'существенное событие даёт d≥1');
  assert.equal(isBreath(refHash, curHash, kEff({ ...p, a: 0 })), true, 'd≥1 при пороге 1 = вдох');
});

// ── Счётчик как чистый редьюсер ───────────────────────────────────────────

test('step: инкремент + сброс refHash на текущий при вдохе', () => {
  const h1 = hashConspectus('Дрон над полем.');
  const state0 = initialState();
  assert.equal(state0.refHash, 0n);
  assert.equal(state0.count, 0);
  assert.notEqual(h1, 0n, 'непустой конспект даёт ненулевой SimHash → d(0n,h1)≥1');
  // порог=1 (мандат K0=Kmin=1): 0n → h1 даёт d≥1 → вдох
  const r1 = step(state0, { curHash: h1, a: 0, K0: 1, Kmin: 1, c: 3 });
  assert.equal(r1.breath, true, 'первое существенное событие — вдох');
  assert.equal(r1.state.count, 1, 'счётчик +1');
  assert.equal(r1.state.refHash, h1, 'опорный сброшен на текущий');
  // вещдок несёт поля отдельно
  assert.deepEqual(Object.keys(r1.evidence).sort(), ['K0', 'a', 'c', 'count', 'd', 'kEff', 'refHash']);
});

test('step: косметика после вдоха — НЕ вдох, счётчик и refHash стоят', () => {
  const h1 = hashConspectus('Дрон над полем, слышен гул.');
  const s1 = step(initialState(), { curHash: h1, a: 0, K0: 1, Kmin: 1, c: 3 }).state;
  const cosmetic = hashConspectus('  ДРОН   над   полем,,,  слышен... ГУЛ!!! ');
  const r2 = step(s1, { curHash: cosmetic, a: 0, K0: 1, Kmin: 1, c: 3 });
  assert.equal(r2.evidence.d, 0, 'косметика → d=0');
  assert.equal(r2.breath, false, 'вдоха нет');
  assert.equal(r2.state.count, 1, 'счётчик стоит');
  assert.equal(r2.state.refHash, h1, 'опорный не сдвинут');
});

test('step: счётчик НИКОГДА не превышает 7 (потолок — no-op)', () => {
  let state = { refHash: 0n, count: 7 };
  // произвольное существенное событие при потолке — no-op
  const r = step(state, { curHash: hashConspectus('нечто новое'), a: 0, K0: 1, Kmin: 1, c: 3 });
  assert.equal(r.breath, false, 'при count=7 вдоха нет');
  assert.equal(r.state.count, 7, 'счётчик не растёт выше 7');
  assert.equal(sevenBreaths(r.state), true, 'потолок держится');
});

test('sevenBreaths: истина ровно при count≥7', () => {
  assert.equal(sevenBreaths({ count: 6 }), false);
  assert.equal(sevenBreaths({ count: 7 }), true);
  assert.equal(BREATH_CEILING, 7);
});

// ── Завершимость ──────────────────────────────────────────────────────────

test('ЗАВЕРШИМОСТЬ: 7 РАЗЛИЧНЫХ по существу событий при Kmin=1 → count=7 за ≤7 шагов', () => {
  // Каждое событие содержательно отличается от предыдущего → d≥1 → при Kmin=1 вдох.
  const conspecti = [
    'Дрон над полем.',
    'Дрон над полем, слышен гул.',
    'Дрон над полем, слышен гул, второй дрон восточнее.',
    'Дрон над полем, слышен гул, второй дрон восточнее, ветер западный.',
    'Три дрона строем, гул нарастает, ветер западный.',
    'Три дрона строем уходят на север, гул стихает.',
    'Поле пусто, дроны ушли, тишина.',
  ];
  // Мандат K_min=1 в крайней realization K0=K_min=1: порог=1, любой d≥1 — вдох.
  let state = initialState();
  let steps = 0;
  for (const text of conspecti) {
    const r = step(state, { curHash: hashConspectus(text), a: 0, K0: 1, Kmin: KMIN_MANDATE, c: 3 });
    steps += 1;
    assert.equal(r.breath, true, `шаг ${steps} «${text}» — вдох (d=${r.evidence.d})`);
    state = r.state;
  }
  assert.ok(steps <= 7, `достигнуто за ${steps} ≤ 7 шагов`);
  assert.equal(state.count, 7, 'потолок сожжён');
  assert.equal(sevenBreaths(state), true, 'шторм закрыт неотменяемо');
});

test('ЗАВЕРШИМОСТЬ: восьмое событие после потолка — no-op (закрытие неотменяемо)', () => {
  let state = initialState();
  const texts = ['a один', 'b два', 'c три', 'd четыре', 'e пять', 'f шесть', 'g семь'];
  for (const t of texts) {
    state = step(state, { curHash: hashConspectus(t), a: 0, K0: 1, Kmin: 1, c: 3 }).state;
  }
  assert.equal(state.count, 7);
  const r8 = step(state, { curHash: hashConspectus('h восемь совсем иное'), a: 0, K0: 1, Kmin: 1, c: 3 });
  assert.equal(r8.breath, false, 'после потолка вдоха нет');
  assert.equal(r8.state.count, 7, 'счётчик заморожен на 7');
});
