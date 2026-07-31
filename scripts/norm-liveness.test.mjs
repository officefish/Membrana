/**
 * Зубы признака жизни нормы (§8 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/norm-liveness.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LIVENESS_VERDICTS,
  MAX_SEARCH_FIRST_RATE,
  MIN_SESSIONS,
  MIN_WORKSHOP_RATE,
  WINDOW_DAYS,
  normLiveness,
  renderLiveness,
} from './lib/norm-liveness.mjs';

const NOW = Date.parse('2026-07-31T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

/** Сессия: `first` — первым содержательным ходом была разведка; `ws` — звала мастерскую. */
const sess = (id, { first = false, ws = true, ageDays = 1 } = {}) => ({
  sessionId: id,
  at: NOW - ageDays * DAY,
  signals: { firstActionWasSearch: first, hasWorkshopCall: ws },
});

/** Набор из n здоровых сессий. */
const healthy = (n) => Array.from({ length: n }, (_, i) => sess(`ok-${i}`));

test('оба порога обязательны — по отдельности каждый обходится', () => {
  assert.equal(MAX_SEARCH_FIRST_RATE, 0.2);
  assert.equal(MIN_WORKSHOP_RATE, 0.5);
  // Никто не начал с разведки, но мастерскую не звал почти никто: первый порог идеален,
  // второй провален — и вердикт обязан быть красным.
  const lazy = Array.from({ length: 10 }, (_, i) => sess(`lazy-${i}`, { ws: i < 3 }));
  const r = normLiveness(lazy, { now: NOW });
  assert.equal(r.verdict, LIVENESS_VERDICTS.VIOLATED);
  assert.equal(r.searchFirstRate, 0);
  assert.match(r.reason, /ниже порога/u);
});

test('норма жива, когда держатся оба порога', () => {
  const r = normLiveness(healthy(10), { now: NOW });
  assert.equal(r.verdict, LIVENESS_VERDICTS.ALIVE);
  assert.equal(r.workshopRate, 1);
  assert.equal(r.searchFirstRate, 0);
  assert.deepEqual(r.failures, []);
});

test('перебор разведки роняет, даже когда мастерскую звали все', () => {
  const grepy = Array.from({ length: 10 }, (_, i) => sess(`g-${i}`, { first: i < 3, ws: true }));
  const r = normLiveness(grepy, { now: NOW });
  assert.equal(r.verdict, LIVENESS_VERDICTS.VIOLATED);
  assert.equal(r.searchFirstRate, 0.3);
  assert.match(r.reason, /выше порога/u);
});

test('граница порога включительна — «не выше» значит 0.2 проходит', () => {
  const edge = Array.from({ length: 10 }, (_, i) => sess(`e-${i}`, { first: i < 2 }));
  const r = normLiveness(edge, { now: NOW });
  assert.equal(r.searchFirstRate, 0.2);
  assert.equal(r.verdict, LIVENESS_VERDICTS.ALIVE, 'иначе «≤ 0.2» на деле означало бы «< 0.2»');
});

// ── Малая выборка ─────────────────────────────────────────────────────────────────────────

test('меньше пяти сессий — «недостаточно», а НЕ зелёный', () => {
  const r = normLiveness(healthy(MIN_SESSIONS - 1), { now: NOW });
  assert.equal(r.verdict, LIVENESS_VERDICTS.INSUFFICIENT);
  assert.notEqual(r.verdict, LIVENESS_VERDICTS.ALIVE, 'идеальные 4 сессии признаком жизни не являются');
  assert.match(r.reason, /выборки недостаточно/u);
});

test('при недостаточной выборке процент не печатается вовсе', () => {
  const text = renderLiveness(normLiveness(healthy(2), { now: NOW }));
  assert.doesNotMatch(text, /\d+\.\d%/u, 'напечатать долю с оговоркой = напечатать долю');
  assert.match(text, /процент не печатается/u);
  assert.match(text, /и нарушения не заявлено/u, 'молчание не обвинение');
});

test('пустой корпус — недостаточно, а не «нарушений ноль»', () => {
  const r = normLiveness([], { now: NOW });
  assert.equal(r.verdict, LIVENESS_VERDICTS.INSUFFICIENT);
  assert.equal(r.considered, 0);
});

// ── Окно и знаменатель ────────────────────────────────────────────────────────────────────

test('за окном не считается, край окна считается', () => {
  const old = Array.from({ length: 10 }, (_, i) => sess(`old-${i}`, { ageDays: WINDOW_DAYS + 1 }));
  assert.equal(normLiveness(old, { now: NOW }).verdict, LIVENESS_VERDICTS.INSUFFICIENT);
  const edge = Array.from({ length: 10 }, (_, i) => sess(`edge-${i}`, { ageDays: WINDOW_DAYS }));
  assert.equal(normLiveness(edge, { now: NOW }).verdict, LIVENESS_VERDICTS.ALIVE);
});

test('сессии без содержательного хода не разбавляют знаменатель', () => {
  // firstActionWasSearch === null: ничего о порядке обращения такая сессия не говорит,
  // и держать её в знаменателе значит разбавлять обе доли молчанием.
  const mute = { sessionId: 'mute', at: NOW - DAY, signals: { firstActionWasSearch: null, hasWorkshopCall: false } };
  const r = normLiveness([...healthy(5), mute, mute, mute], { now: NOW });
  assert.equal(r.inWindow, 8);
  assert.equal(r.considered, 5, 'молчащие сессии видны в окне, но в предикат не входят');
  assert.equal(r.workshopRate, 1, 'иначе три молчания уронили бы долю до 5/8');
});

test('момент проверки обязателен — часы внутрь мерки не пускаются', () => {
  const r = normLiveness(healthy(10), {});
  assert.equal(r.verdict, LIVENESS_VERDICTS.INSUFFICIENT);
  assert.match(r.reason, /момент проверки не назван/u);
});

test('отчёт называет находку находкой, а не блоком', () => {
  const grepy = Array.from({ length: 10 }, (_, i) => sess(`g-${i}`, { first: i < 5 }));
  const text = renderLiveness(normLiveness(grepy, { now: NOW }));
  assert.match(text, /норма нарушена/u);
  assert.match(text, /НАХОДКА, не блок/u);
  assert.match(text, /ничего не останавливает/u);
});
