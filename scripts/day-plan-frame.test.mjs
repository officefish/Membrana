/**
 * Юнит-тесты каркаса плана дня (K, вердикт M2). Чистые функции — без сети/DOM/моков.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { frame, rank, buildTop3, buildPlanDraft, fillInput, candidatesFromRegistry, ZONE_ORDER } from './lib/day-plan-frame.mjs';

const c = (id, zone, size) => ({ id, zone, size });

test('frame: ровно 5 слотов, константный порядок и id/title между вызовами', () => {
  const a = frame();
  const b = frame();
  assert.equal(a.length, 5);
  assert.deepEqual(a.map((s) => s.id), ['magistral', 'reinforcement', 'perspective', 'experimental', 'sanitary']);
  assert.deepEqual(a.map((s) => s.order), [1, 2, 3, 4, 5]);
  assert.deepEqual(a.map((s) => [s.id, s.title]), b.map((s) => [s.id, s.title]), 'стабилен между вызовами');
});

test('frame: слоты заморожены — структуру нельзя мутировать', () => {
  const [slot] = frame();
  assert.throws(() => { slot.title = 'взлом'; }, 'title неизменяем');
});

test('rank: внутри зоны — по силе размера, tie-break по id', () => {
  const r = rank([c('b', 'product', 'M'), c('a', 'product', 'L'), c('c', 'product', 'L')]);
  // L раньше M; среди L — по id: a раньше c
  assert.deepEqual(r.map((x) => x.id), ['a', 'c', 'b']);
});

test('buildTop3: балансировка — не три из одной зоны при наличии альтернатив', () => {
  const snap = { candidates: [
    c('p1', 'product', 'L'), c('p2', 'product', 'L'), c('p3', 'product', 'M'),
    c('t1', 'tooling', 'L'),
    c('b1', 'business', 'M'),
  ] };
  const top = buildTop3(snap);
  assert.equal(top.length, 3);
  assert.deepEqual(top.map((x) => x.zone), ['product', 'tooling', 'business'], 'по одному с зоны — round-robin');
  assert.equal(top[0].id, 'p1', 'сильнейший продукт');
});

test('buildTop3: детерминирован на фиксированном снимке', () => {
  const snap = { candidates: [c('t1', 'tooling', 'L'), c('p1', 'product', 'L'), c('b1', 'business', 'L')] };
  assert.deepEqual(buildTop3(snap).map((x) => x.id), buildTop3(snap).map((x) => x.id));
  // порядок зон фиксирован: product → tooling → business
  assert.deepEqual(buildTop3(snap).map((x) => x.zone), ['product', 'tooling', 'business']);
});

test('buildTop3: n<3 → меньше без добивки', () => {
  assert.equal(buildTop3({ candidates: [c('p1', 'product', 'L'), c('t1', 'tooling', 'M')] }).length, 2);
  assert.equal(buildTop3({ candidates: [] }).length, 0);
  assert.equal(buildTop3({}).length, 0);
});

test('buildTop3: три из одной зоны, если альтернатив НЕТ (не выдумывает зоны)', () => {
  const top = buildTop3({ candidates: [c('p1', 'product', 'L'), c('p2', 'product', 'M'), c('p3', 'product', 'S'), c('p4', 'product', 'S')] });
  assert.deepEqual(top.map((x) => x.id), ['p1', 'p2', 'p3']);
});

test('buildPlanDraft: каркас + топ-3, детерминирован', () => {
  const snap = { candidates: [c('t1', 'tooling', 'L'), c('p1', 'product', 'L')] };
  const d = buildPlanDraft(snap);
  assert.equal(d.slots.length, 5);
  assert.deepEqual(d.top3.map((x) => x.id), ['p1', 't1']);
});

test('fillInput: стенка Slot→Text — не отдаёт id/order/title', () => {
  const [slot] = frame();
  const fi = fillInput(slot, [{ id: 'x' }]);
  assert.equal(fi.kind, 'magistral');
  assert.equal(fi.id, undefined, 'id не просачивается в fill');
  assert.equal(fi.order, undefined, 'order не просачивается');
  assert.equal(fi.title, undefined, 'title не просачивается');
});

test('ZONE_ORDER: продукт первым (крен владельца), затем тулинг, бизнес', () => {
  assert.deepEqual([...ZONE_ORDER], ['product', 'tooling', 'business']);
});

test('candidatesFromRegistry: только активные заданного размера, зона из поля (null допустим)', () => {
  const tasks = [
    { id: 'a', status: 'active', size: 'L', zone: 'product' },
    { id: 'b', status: 'active', size: 'L' }, // без зоны → null
    { id: 'c', status: 'active', size: 'M', zone: 'tooling' }, // не L
    { id: 'd', status: 'archived', size: 'L', zone: 'business' }, // не active
  ];
  const cands = candidatesFromRegistry(tasks);
  assert.deepEqual(cands.map((c) => c.id), ['a', 'b'], 'только active L');
  assert.equal(cands[0].zone, 'product');
  assert.equal(cands[1].zone, null, 'без зоны → null');
});

test('candidatesFromRegistry: пустой/битый вход → []', () => {
  assert.deepEqual(candidatesFromRegistry([]), []);
  assert.deepEqual(candidatesFromRegistry(undefined), []);
});

test('candidatesFromRegistry → buildTop3: незонированные кандидаты идут в хвост, топ-3 по силе', () => {
  const tasks = [
    { id: 'p', status: 'active', size: 'L', zone: 'product' },
    { id: 'u1', status: 'active', size: 'L' },
    { id: 'u2', status: 'active', size: 'L' },
  ];
  const top = buildTop3({ candidates: candidatesFromRegistry(tasks) });
  assert.equal(top[0].id, 'p', 'зонированный продукт впереди хвоста');
  assert.equal(top.length, 3);
});
