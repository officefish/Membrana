/**
 * Зубы блока error-class-four-states (спринт instruments-honest-verdict, #1549).
 *
 * Предмет: класс отказа называет то, что наблюдаемо, и молчит о том, что нет.
 * Вещдок, ради которого блок и взят: 05.08 ключ `X_AI_API_KEY` не менялся с 31.07,
 * в 13:00 звено дало 401/403, в 18:18 то же звено ответило 200 — прежний `auth`
 * назвал это отказом авторизации, агент записал в HANDOFF «ключа нет вовсе».
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyTransportError,
  confirmAuthDenial,
  toEmitClass,
  TRANSPORT_ERROR_CLASSES,
} from './llm-procedure-transport.mjs';

test('no_key — единственный класс, наблюдаемый на 100%: ключа нет в окружении', () => {
  assert.equal(classifyTransportError(0, '', { hasKey: false }), 'no_key');
  // hasKey:false перевешивает любой статус — состояние известно ДО вызова
  assert.equal(classifyTransportError(500, 'server error', { hasKey: false }), 'no_key');
});

test('одиночный 401/403 при живом ключе — transient, а НЕ приговор авторизации', () => {
  assert.equal(classifyTransportError(401, '', { hasKey: true }), 'transient');
  assert.equal(classifyTransportError(403, 'forbidden', { hasKey: true }), 'transient');
  assert.ok(!TRANSPORT_ERROR_CLASSES.includes('auth'), 'слова auth во внутреннем словаре больше нет');
});

test('сторона провайдера — transient: 5xx, сеть (status 0)', () => {
  assert.equal(classifyTransportError(500, '', { hasKey: true }), 'transient');
  assert.equal(classifyTransportError(502, '', { hasKey: true }), 'transient');
  assert.equal(classifyTransportError(0, '', { hasKey: true }), 'transient');
});

test('квоты и таймауты сохраняют свои имена — их наблюдаемость не менялась', () => {
  assert.equal(classifyTransportError(429, '', { hasKey: true }), 'rate_limit');
  assert.equal(classifyTransportError(400, 'rate limit exceeded', { hasKey: true }), 'rate_limit');
  assert.equal(classifyTransportError(400, 'insufficient credit', { hasKey: true }), 'rate_limit');
  assert.equal(classifyTransportError(408, '', { hasKey: true }), 'timeout');
  assert.equal(classifyTransportError(504, '', { hasKey: true }), 'timeout');
  assert.equal(classifyTransportError(422, '', { hasKey: true }), 'protocol');
});

test('confirmAuthDenial: подозрение выносится по ИСТОРИИ, успех его гасит', () => {
  const denial = (at) => ({ status: 403, at });
  const success = (at) => ({ status: 200, at });

  // Ровно случай 05.08: отказ, потом успех — подтверждения нет
  const may = confirmAuthDenial([denial(1), success(2)], { now: 3, windowMs: 1000 });
  assert.equal(may.confirmed, false);
  assert.equal(may.denials, 0, 'успех обнуляет счётчик подозрения');
  assert.match(may.reason, /отказов авторизации в окне нет/u);

  // Два отказа подряд без успеха — подтверждено
  const confirmed = confirmAuthDenial([denial(1), denial(2)], { now: 3, windowMs: 1000 });
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.denials, 2);

  // Один отказ фактом не считается, и причина это говорит вслух
  const single = confirmAuthDenial([denial(1)], { now: 2, windowMs: 1000 });
  assert.equal(single.confirmed, false);
  assert.match(single.reason, /одиночный 401\/403 фактом не считается/u);

  // Отказы вне окна не считаются
  const stale = confirmAuthDenial([denial(1), denial(2)], { now: 100_000, windowMs: 10 });
  assert.equal(stale.confirmed, false);
  assert.equal(stale.denials, 0);
});

test('toEmitClass: замороженный enum эмиттера не ломается — чужая зона цела', () => {
  const legacy = new Set(['auth', 'rate_limit', 'timeout', 'protocol', 'unknown']);
  for (const internal of TRANSPORT_ERROR_CLASSES) {
    assert.ok(legacy.has(toEmitClass(internal)), `${internal} обязан отобразиться в legacy-enum`);
  }
  assert.equal(toEmitClass('no_key'), 'auth');
  assert.equal(toEmitClass('auth_denied_unstable'), 'auth');
  assert.equal(toEmitClass('transient'), 'protocol');
  assert.equal(toEmitClass('rate_limit'), 'rate_limit');
});
