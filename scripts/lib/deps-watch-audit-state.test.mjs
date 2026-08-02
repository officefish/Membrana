/**
 * Зубы стража состояния аудита.
 *
 * Держат риск, названный резчиком 02.08: один моргнувший реестр отдаёт пустой ответ, и наивное
 * сравнение объявляет переставшими сообщаться ВСЕ записи разом — вранья того же рода, что и
 * «закрыто за день», только масштабом больше.
 *
 * Прогон: `node --test scripts/lib/deps-watch-audit-state.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AUDIT_STATES, auditState, comparable, snapshotWritable } from './deps-watch-audit-state.mjs';

const finding = (pkg) => ({ pkg, id: '1', severity: 'high' });

test('аудит не отработал — состояние not_run, сравнение запрещено', () => {
  const r = auditState({ ran: false, previousCount: 12 });
  assert.equal(r.state, AUDIT_STATES.NOT_RUN);
  assert.equal(comparable(r.state), false);
  assert.equal(snapshotWritable(r.state), false);
});

test('пусто при непустом прошлом — подозрение, а не «все закрылись»', () => {
  const r = auditState({ ran: true, findings: [], previousCount: 12 });
  assert.equal(r.state, AUDIT_STATES.SUSPECT_EMPTY);
  assert.equal(comparable(r.state), false);
  assert.ok(r.reason.includes('12'), 'в причине названо, сколько записей было');
});

test('подозрительно пустой ответ снимок НЕ затирает — история наблюдения дороже свежести', () => {
  const r = auditState({ ran: true, findings: [], previousCount: 1 });
  assert.equal(snapshotWritable(r.state), false);
});

test('пусто при пустом прошлом — законное «чисто», сравнивать можно', () => {
  const r = auditState({ ran: true, findings: [], previousCount: 0 });
  assert.equal(r.state, AUDIT_STATES.OK);
  assert.equal(comparable(r.state), true);
  assert.equal(snapshotWritable(r.state), true);
});

test('первый прогон без снимка вовсе — ok, а не подозрение', () => {
  const r = auditState({ ran: true, findings: [finding('a')] });
  assert.equal(r.state, AUDIT_STATES.OK);
});

test('обычный прогон с записями — ok, причина несёт число', () => {
  const r = auditState({ ran: true, findings: [finding('a'), finding('b')], previousCount: 2 });
  assert.equal(r.state, AUDIT_STATES.OK);
  assert.ok(r.reason.includes('2'));
});

test('падение состава с 12 до 1 подозрением НЕ считается — страж ловит пустоту, не убыль', () => {
  // Граница названа сознательно: убыль может быть настоящей (закрыли корзину «СРАЗУ»), и
  // объявлять её подозрительной значило бы завести ложное красное на честной работе.
  const r = auditState({ ran: true, findings: [finding('a')], previousCount: 12 });
  assert.equal(r.state, AUDIT_STATES.OK);
});

test('список состояний закрыт тремя', () => {
  assert.deepEqual(Object.values(AUDIT_STATES).sort(), ['not_run', 'ok', 'suspect_empty']);
});
