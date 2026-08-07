/**
 * Тесты двухгейтового утра (M3-G angelina-hostess) + #1233 (день / digest / ally).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  magistralChosen, swallowApproved, canSend, canSendAlly,
  sendIdempotencyKey, freezeTopThree, terminalSend,
  dayFresh, draftDigestOf, payloadMatchesDraft, todayIso,
  magistralMoment, magistralMomentFresh,
} from './lib/morning-gates.mjs';

const DAY = '2026-07-26';

const okState = () => ({
  day: DAY,
  // ADR-0024: у магистрали СВОЙ момент. Прежде свежесть выбора бралась из общего `day`.
  magistralChosenAt: DAY,
  magistral: 'task-b',
  magistralOptions: ['task-a', 'task-b', 'task-c'],
  swallow: { ownerAck: true, draftDigest: draftDigestOf('approved body') },
});

test('dayFresh: совпадение day/today; без day или чужой день — false', () => {
  assert.equal(dayFresh({ day: DAY }, DAY), true);
  assert.equal(dayFresh({}, DAY), false);
  assert.equal(dayFresh({ day: '2026-07-22' }, DAY), false);
  assert.equal(dayFresh({ day: DAY }, ''), false);
});

test('magistralChosen: требует сегодня; выбор ∈ снимок — true', () => {
  assert.equal(magistralChosen(okState(), DAY), true);
  // ADR-0024 сменил контракт: свежесть выбора живёт в СВОЁМ моменте, не в общем `day`.
  assert.equal(
    magistralChosen({ ...okState(), magistralChosenAt: '2026-07-22' }, DAY),
    false,
    'вчерашний ВЫБОР протух',
  );
  assert.equal(
    magistralChosen({ ...okState(), day: '2026-07-22' }, DAY),
    true,
    'чужой протухший день (ласточки) магистраль НЕ роняет — в этом и была починка',
  );
  assert.equal(magistralChosen({ magistral: 'ghost', magistralOptions: ['a'], magistralChosenAt: DAY }, DAY), false);
  assert.equal(magistralChosen({ magistralOptions: ['a'], magistralChosenAt: DAY }, DAY), false);
  assert.equal(magistralChosen({}, DAY), false);
});

test('swallowApproved: ack + digest + сегодня; вчерашний ack — false', () => {
  assert.equal(swallowApproved(okState(), DAY), true);
  assert.equal(swallowApproved({ ...okState(), day: '2026-07-22' }, DAY), false, 'ок от 22.07 не живёт 26.07');
  assert.equal(swallowApproved({ day: DAY, swallow: { ownerAck: true } }, DAY), false);
  assert.equal(swallowApproved({ day: DAY, swallow: { ownerAck: false, draftDigest: 'd' } }, DAY), false);
});

test('canSend: причина называется ПО СУБЪЕКТУ, а не одной строкой про общий день', () => {
  // ADR-0024 сменил контракт: прежде ранний выход по общему `day` давал ОДНУ причину
  // «состояние протухло» и скрывал, КОТОРЫЙ из двух гейтов виноват. Теперь каждый
  // сомножитель отвечает за себя.
  const stale = canSend({ ...okState(), day: '2026-07-22' }, DAY);
  assert.equal(stale.ok, false);
  assert.equal(stale.blockedBy.length, 1, 'протух только черновик — магистраль не при чём');
  assert.match(stale.blockedBy[0], /swallow-send/u);

  const empty = canSend({}, DAY);
  assert.equal(empty.blockedBy.length, 2, 'пустое состояние — оба субъекта неизвестны');
  assert.match(empty.blockedBy.join(' '), /magistral/u);
  assert.match(empty.blockedBy.join(' '), /swallow-send/u);

  const one = canSend({ ...okState(), swallow: {} }, DAY);
  assert.equal(one.ok, false);
  assert.equal(one.blockedBy.length, 1);
  assert.match(one.blockedBy[0], /swallow/u);
  assert.equal(canSend(okState(), DAY).ok, true);
});

test('payloadMatchesDraft / canSendAlly: чужой файл не уходит', () => {
  const state = okState();
  assert.equal(payloadMatchesDraft(state, 'approved body'), true);
  assert.equal(payloadMatchesDraft(state, 'другой текст'), false);

  const ok = canSendAlly(state, DAY, 'approved body');
  assert.equal(ok.ok, true);

  const mismatch = canSendAlly(state, DAY, 'другой текст');
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.blockedBy.join(' '), /digest/u);

  const stale = canSendAlly({ ...state, day: '2026-07-22' }, DAY, 'approved body');
  assert.equal(stale.ok, false);
  assert.match(stale.blockedBy[0], /day:/u);
});

test('canSendAlly: без magistral — ок (вечерний контур)', () => {
  const evening = {
    day: DAY,
    swallow: { ownerAck: true, draftDigest: draftDigestOf('evening note') },
  };
  assert.equal(canSend(evening, DAY).ok, false, 'утренний canSend всё ещё требует magistral');
  assert.equal(canSendAlly(evening, DAY, 'evening note').ok, true);
});

test('freezeTopThree: несёт day; снимок детерминирован', () => {
  const a = freezeTopThree([{ id: 'x' }, { id: 'y' }], DAY);
  const b = freezeTopThree([{ id: 'x' }, { id: 'y' }], DAY);
  assert.deepEqual(a, b);
  assert.equal(a.day, DAY);
  assert.equal(typeof todayIso(), 'string');
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/u);
});

test('sendIdempotencyKey: по дню утра, не по попытке', () => {
  assert.equal(sendIdempotencyKey('p', '2026-07-21'), sendIdempotencyKey('p', '2026-07-21'));
  assert.notEqual(sendIdempotencyKey('p', '2026-07-21'), sendIdempotencyKey('p', '2026-07-22'));
});

test('terminalSend: блок → транспорт НЕ вызван; digest mismatch тоже блок', async () => {
  let calls = 0;
  const r = await terminalSend({}, 'p', DAY, { transport: async () => { calls += 1; } });
  assert.equal(r.sent, false);
  assert.equal(calls, 0);
  // ADR-0024: у пустого состояния первым называется субъект магистрали, а не общий день.
  assert.match(r.blockedBy.join(' '), /magistral/u);

  const badDigest = await terminalSend(okState(), 'not-approved', DAY, {
    transport: async () => { calls += 1; },
  });
  assert.equal(badDigest.sent, false);
  assert.equal(calls, 0);
  assert.match(badDigest.blockedBy.join(' '), /digest/u);
});

test('terminalSend: pass → один выстрел; повтор того же дня → duplicate no-op', async () => {
  let calls = 0;
  const io = { transport: async () => { calls += 1; }, sentKeys: new Set() };
  const r1 = await terminalSend(okState(), 'approved body', DAY, io);
  const r2 = await terminalSend(okState(), 'approved body', DAY, io);
  assert.equal(r1.sent, true);
  assert.equal(r2.sent, false);
  assert.equal(r2.duplicate, true);
  assert.equal(calls, 1);
});

test('magistralChosen: подмена options при frozenDigest — гейт закрыт (P2 #762)', () => {
  const { magistralOptions, frozenDigest, day } = freezeTopThree([{ id: 'a' }, { id: 'b' }, { id: 'c' }], DAY);
  const honest = { day, magistralChosenAt: day, magistral: 'b', magistralOptions, frozenDigest };
  assert.equal(magistralChosen(honest, DAY), true);
  const forged = { day, magistralChosenAt: day, magistral: 'ghost', magistralOptions: [...magistralOptions, 'ghost'], frozenDigest };
  assert.equal(magistralChosen(forged, DAY), false);
});

// ─── два субъекта — два момента (ADR-0024, долг #gates-state-magistral-carryover) ───
//
// Дефект: одно поле `day` обслуживало оба гейта. `swallow --draft` ставил day=today и
// магистрали не касался — утро, пошедшее к черновику мимо заморозки, получало сегодняшнюю
// дату при ВЧЕРАШНЕМ выборе. `status` докладывал ложный owner-choice, `canSend` считал
// предикат выполненным. Наблюдалось трижды, 05.08–07.08.

const TODAY = '2026-08-07';
const YESTERDAY = '2026-08-06';
const snapshot = (ids) => freezeTopThree(ids, TODAY);

test('ГЛАВНЫЙ случай: свежий черновик НЕ делает вчерашний выбор сегодняшним', () => {
  const state = {
    ...snapshot(['a', 'b']),
    magistral: 'a',
    magistralChosenAt: YESTERDAY, // выбор был вчера
    day: TODAY, // а черновик ласточки — сегодняшний
    swallow: { draftDigest: 'd', ownerAck: true },
  };
  assert.equal(magistralChosen(state, TODAY), false, 'ложный owner-choice — ровно чинимый дефект');
  assert.equal(swallowApproved(state, TODAY), true, 'ласточка при этом законно сегодняшняя');
  const gate = canSend(state, TODAY);
  assert.equal(gate.ok, false);
  assert.match(gate.blockedBy.join(' '), /выбор не сегодняшний \(сделан 2026-08-06\)/);
});

test('момент магистрали читается отдельно от дня ласточки', () => {
  assert.equal(magistralMoment({ magistralChosenAt: TODAY }), TODAY);
  assert.equal(magistralMoment({ day: TODAY }), null, 'общий день моментом магистрали не является');
  assert.equal(magistralMoment({}), null);
  assert.equal(magistralMoment({ magistralChosenAt: '  ' }), null, 'пустая строка — не момент');
});

test('Р4: старое состояние без momenta читается как НЕИЗВЕСТНЫЙ, а не наследует day', () => {
  const legacy = { ...snapshot(['a']), magistral: 'a', day: TODAY, magistralChosenAt: undefined };
  assert.equal(magistralMomentFresh(legacy, TODAY), false, 'наследование воспроизвело бы дефект при починке');
  assert.equal(magistralChosen(legacy, TODAY), false);
  assert.match(canSend(legacy, TODAY).blockedBy.join(' '), /момент выбора неизвестен/);
});

test('оба момента сегодняшние — гейт открыт', () => {
  const state = {
    ...snapshot(['a', 'b']),
    magistral: 'a',
    magistralChosenAt: TODAY,
    day: TODAY,
    swallow: { draftDigest: 'd', ownerAck: true },
  };
  assert.equal(magistralChosen(state, TODAY), true);
  assert.equal(canSend(state, TODAY).ok, true);
});

test('обратный случай: выбор сегодняшний, а черновик вчерашний — блок ТОЛЬКО по ласточке', () => {
  const state = {
    ...snapshot(['a']),
    magistral: 'a',
    magistralChosenAt: TODAY,
    day: YESTERDAY,
    swallow: { draftDigest: 'd', ownerAck: true },
  };
  const gate = canSend(state, TODAY);
  assert.equal(gate.ok, false);
  assert.equal(gate.blockedBy.length, 1, 'магистраль не должна попасть под чужую протухлость');
  assert.match(gate.blockedBy[0], /swallow-send: черновик не сегодняшний/);
});

test('Р3: заморозка снимает момент выбора вместе с самим выбором', () => {
  const frozen = freezeTopThree(['x', 'y'], TODAY);
  assert.equal(frozen.magistralChosenAt, null, 'иначе выбор по ПРЕЖНЕМУ списку числился бы сегодняшним');
  assert.equal(frozen.day, TODAY);
});

test('canSend называет ОБА гейта раздельно, а не «состояние протухло» одной строкой', () => {
  const gate = canSend({ day: YESTERDAY }, TODAY);
  assert.equal(gate.blockedBy.length, 2, 'прежний ранний выход скрывал, КОТОРЫЙ из двух протух');
  assert.match(gate.blockedBy.join(' '), /magistral/);
  assert.match(gate.blockedBy.join(' '), /swallow-send/);
});
