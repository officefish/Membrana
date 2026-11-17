/**
 * Юнит-тесты каркаса плана дня (K, вердикт M2). Чистые функции — без сети/DOM/моков.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { frame, rank, buildTop3, buildPlanDraft, fillInput, candidatesFromRegistry, excludedCandidates, ZONE_ORDER } from './lib/day-plan-frame.mjs';

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

// b3 ritual-reads-decisions: карточка закрытого прогона спринта — не кандидат (живой случай 30.09).
const LIVE_30_09 = [
  { id: 'angelina-hostess-impl', status: 'active', size: 'L' },
  { id: 'assets-container', status: 'active', size: 'L' },
  { id: 'batch-collection-run-contour', status: 'active', size: 'L' },
  { id: 'trace-freeze-dual-candidate-sprint', status: 'active', size: 'L' },
  { id: 'capture-sidecar-protocol', status: 'active', size: 'L' },
];
const CLOSED_29_09 = [
  { sprintId: 'batch-collection-run-contour', status: 'pass', closedDay: '2026-09-29', card: 'active', phasesActive: 4 },
  { sprintId: 'trace-freeze-dual-candidate-sprint', status: 'pass', closedDay: '2026-09-29', card: 'active', phasesActive: 5 },
];

test('b3: карточка active L + close-запись её спринта → НЕ в top-3 и названа в исключённых с причиной', () => {
  const cands = candidatesFromRegistry(LIVE_30_09, { closedSprints: CLOSED_29_09 });
  const top = buildTop3({ candidates: cands });
  assert.deepEqual(top.map((x) => x.id), ['angelina-hostess-impl', 'assets-container', 'capture-sidecar-protocol']);
  const excluded = excludedCandidates(LIVE_30_09, { closedSprints: CLOSED_29_09 });
  assert.deepEqual(excluded.map((e) => e.id), ['batch-collection-run-contour', 'trace-freeze-dual-candidate-sprint']);
  assert.match(excluded[0].reason, /прогон спринта закрыт 2026-09-29 \(гейт pass\); карточка не архивирована — долг закрытия/u);
});

test('b3 ПОРЧА: без close-записи та же карточка остаётся в top-3; порядок остальных не меняется', () => {
  const top = buildTop3({ candidates: candidatesFromRegistry(LIVE_30_09, { closedSprints: [] }) });
  assert.deepEqual(top.map((x) => x.id), ['angelina-hostess-impl', 'assets-container', 'batch-collection-run-contour']);
  assert.deepEqual(excludedCandidates(LIVE_30_09, { closedSprints: [] }), []);
  // Без ведомости вовсе — отбор прежний и исключённых нет (о чём посылка плана скажет отдельно).
  assert.deepEqual(candidatesFromRegistry(LIVE_30_09).map((x) => x.id), LIVE_30_09.map((t) => t.id));
  assert.deepEqual(excludedCandidates(LIVE_30_09), []);
});

test('b3: исключение действует и на размер M (фолбэк при пустых L); архивная карточка кандидатом и не была', () => {
  const tasks = [
    { id: 'm-open', status: 'active', size: 'M' },
    { id: 'm-closed', status: 'active', size: 'M' },
    { id: 'm-archived', status: 'archived', size: 'M' },
  ];
  const closed = [
    { sprintId: 'm-closed', status: 'fail', closedDay: '2026-09-28', card: 'active', phasesActive: 0 },
    { sprintId: 'm-archived', status: 'pass', closedDay: '2026-09-28', card: 'archived', phasesActive: 0 },
  ];
  assert.deepEqual(candidatesFromRegistry(tasks, { size: 'M', closedSprints: closed }).map((x) => x.id), ['m-open']);
  const ex = excludedCandidates(tasks, { size: 'M', closedSprints: closed });
  assert.deepEqual(ex.map((e) => e.id), ['m-closed']);
  assert.match(ex[0].reason, /закрыт fail/u);
});
