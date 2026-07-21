/**
 * Тесты двухгейтового утра (M3-G angelina-hostess). Чистые; транспорт — мок.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  magistralChosen, swallowApproved, canSend,
  sendIdempotencyKey, freezeTopThree, terminalSend,
} from './lib/morning-gates.mjs';

const okState = () => ({
  magistral: 'task-b',
  magistralOptions: ['task-a', 'task-b', 'task-c'],
  swallow: { ownerAck: true, draftDigest: 'd1' },
});

test('magistralChosen: выбор ∈ снимок — true; вне снимка / нет выбора — false', () => {
  assert.equal(magistralChosen(okState()), true);
  assert.equal(magistralChosen({ magistral: 'ghost', magistralOptions: ['a'] }), false);
  assert.equal(magistralChosen({ magistralOptions: ['a'] }), false);
  assert.equal(magistralChosen({}), false);
});

test('swallowApproved: ack + показанный черновик; ack без черновика — false', () => {
  assert.equal(swallowApproved(okState()), true);
  assert.equal(swallowApproved({ swallow: { ownerAck: true } }), false, 'ок без показанного черновика не считается');
  assert.equal(swallowApproved({ swallow: { ownerAck: false, draftDigest: 'd' } }), false);
});

test('canSend: block×2 → две причины; block×1 → одна; pass → ok', () => {
  assert.equal(canSend({}).blockedBy.length, 2);
  const one = canSend({ ...okState(), swallow: {} });
  assert.equal(one.ok, false);
  assert.equal(one.blockedBy.length, 1);
  assert.match(one.blockedBy[0], /swallow/u);
  assert.equal(canSend(okState()).ok, true);
});

test('freezeTopThree: снимок детерминирован', () => {
  const a = freezeTopThree([{ id: 'x' }, { id: 'y' }]);
  const b = freezeTopThree([{ id: 'x' }, { id: 'y' }]);
  assert.deepEqual(a, b);
});

test('sendIdempotencyKey: по дню утра, не по попытке', () => {
  assert.equal(sendIdempotencyKey('p', '2026-07-21'), sendIdempotencyKey('p', '2026-07-21'));
  assert.notEqual(sendIdempotencyKey('p', '2026-07-21'), sendIdempotencyKey('p', '2026-07-22'));
});

test('terminalSend: блок → транспорт НЕ вызван, причины названы', async () => {
  let calls = 0;
  const r = await terminalSend({}, 'p', '2026-07-21', { transport: async () => { calls += 1; } });
  assert.equal(r.sent, false);
  assert.equal(calls, 0, 'ружья нет: мимо предикатов эффект недостижим');
  assert.equal(r.blockedBy.length, 2);
});

test('terminalSend: pass → один выстрел; повтор того же дня → duplicate no-op', async () => {
  let calls = 0;
  const io = { transport: async () => { calls += 1; }, sentKeys: new Set() };
  const r1 = await terminalSend(okState(), 'p', '2026-07-21', io);
  const r2 = await terminalSend(okState(), 'p', '2026-07-21', io);
  assert.equal(r1.sent, true);
  assert.equal(r2.sent, false);
  assert.equal(r2.duplicate, true);
  assert.equal(calls, 1, 'таймаут+ретрай → один выстрел');
});
