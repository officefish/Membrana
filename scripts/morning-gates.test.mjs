/**
 * Тесты двухгейтового утра (M3-G angelina-hostess) + #1233 (день / digest / ally).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  magistralChosen, swallowApproved, canSend, canSendAlly,
  sendIdempotencyKey, freezeTopThree, terminalSend,
  dayFresh, draftDigestOf, payloadMatchesDraft, todayIso,
} from './lib/morning-gates.mjs';

const DAY = '2026-07-26';

const okState = () => ({
  day: DAY,
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
  assert.equal(magistralChosen({ ...okState(), day: '2026-07-22' }, DAY), false, 'вчерашний снимок протух');
  assert.equal(magistralChosen({ magistral: 'ghost', magistralOptions: ['a'], day: DAY }, DAY), false);
  assert.equal(magistralChosen({ magistralOptions: ['a'], day: DAY }, DAY), false);
  assert.equal(magistralChosen({}, DAY), false);
});

test('swallowApproved: ack + digest + сегодня; вчерашний ack — false', () => {
  assert.equal(swallowApproved(okState(), DAY), true);
  assert.equal(swallowApproved({ ...okState(), day: '2026-07-22' }, DAY), false, 'ок от 22.07 не живёт 26.07');
  assert.equal(swallowApproved({ day: DAY, swallow: { ownerAck: true } }, DAY), false);
  assert.equal(swallowApproved({ day: DAY, swallow: { ownerAck: false, draftDigest: 'd' } }, DAY), false);
});

test('canSend: протухший день — одна причина day; иначе block×2 / pass', () => {
  const stale = canSend({ ...okState(), day: '2026-07-22' }, DAY);
  assert.equal(stale.ok, false);
  assert.equal(stale.blockedBy.length, 1);
  assert.match(stale.blockedBy[0], /day:/u);

  assert.equal(canSend({}, DAY).blockedBy.length, 1);
  assert.match(canSend({}, DAY).blockedBy[0], /day:/u);

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
  assert.match(r.blockedBy[0], /day:/u);

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
  const honest = { day, magistral: 'b', magistralOptions, frozenDigest };
  assert.equal(magistralChosen(honest, DAY), true);
  const forged = { day, magistral: 'ghost', magistralOptions: [...magistralOptions, 'ghost'], frozenDigest };
  assert.equal(magistralChosen(forged, DAY), false);
});
