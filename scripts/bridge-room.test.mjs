/**
 * Тесты комнаты «мостик» (#936): ядро состояния (Б1), реестр долгов попугая (Б2),
 * провод в вечерний ритуал (Б4). Чистые функции — без сети/моков.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CLOSED, closeRoom, isOpen, openRoom } from './lib/bridge-room.mjs';
import { addDebt, openDebts, parseDebts, renderDebts, settleDebt } from './lib/bridge-debts.mjs';

// ─── Б1: конечный автомат состояния ─────────────────────────────────────────────

test('bridge-room: открытие явное closed → opened', () => {
  const r = openRoom(CLOSED, { day: '2026-07-22', cap: 'cap' });
  assert.equal(r.opened, true);
  assert.equal(isOpen(r.state), true);
  assert.equal(r.state.day, '2026-07-22');
});

test('bridge-room: повторное открытие идемпотентно — не второй дом', () => {
  const first = openRoom(CLOSED, { day: '2026-07-22' }).state;
  const again = openRoom(first, { day: '2026-07-22' });
  assert.equal(again.already, true);
  assert.equal(again.opened, false);
  assert.deepEqual(again.state, first, 'состояние не переписано');
});

test('bridge-room: закрытие opened → closed возвращает день', () => {
  const opened = openRoom(CLOSED, { day: '2026-07-22' }).state;
  const r = closeRoom(opened);
  assert.equal(r.closed, true);
  assert.equal(r.day, '2026-07-22');
  assert.equal(isOpen(r.state), false);
});

test('bridge-room: закрытие закрытой — no-op, не пустота (анти-молчун)', () => {
  const r = closeRoom(CLOSED);
  assert.equal(r.closed, false, 'честный false, вызывающий печатает «не открыт»');
  assert.equal(isOpen(r.state), false);
});

test('bridge-room: openRoom без day — громкая ошибка', () => {
  assert.throws(() => openRoom(CLOSED, {}), /нужен day/u);
});

// ─── Б2: реестр долгов попугая (append-only) ────────────────────────────────────

const SAMPLE = ['| a-1 | долг раз | #1 | open | 2026-07-22 |', '| a-2 | долг два | #2 | settled | 2026-07-22 |'].join('\n');

test('bridge-debts: parse/openDebts различают open и settled', () => {
  const debts = parseDebts(SAMPLE);
  assert.equal(debts.length, 2);
  assert.equal(openDebts(debts).length, 1, 'только open зачитывается попугаем');
  assert.equal(openDebts(debts)[0].id, 'a-1');
});

test('bridge-debts: addDebt требует вещдок и запрещает дубль', () => {
  const d = parseDebts(SAMPLE);
  assert.throws(() => addDebt(d, { id: 'a-3', debt: 'x' }), /вещдок обязателен/u);
  assert.throws(() => addDebt(d, { id: 'a-1', debt: 'x', evidence: '#9', date: 'd' }), /уже в реестре/u);
  const next = addDebt(d, { id: 'a-3', debt: 'новый', evidence: '#3', date: '2026-07-22' });
  assert.equal(next.length, 3);
});

test('bridge-debts: settle помечает, не удаляет (append-only)', () => {
  const d = parseDebts(SAMPLE);
  const next = settleDebt(d, 'a-1');
  assert.equal(next.length, 2, 'запись остаётся');
  assert.equal(next.find((x) => x.id === 'a-1').status, 'settled');
  assert.equal(openDebts(next).length, 0);
  assert.throws(() => settleDebt(d, 'нет-такого'), /не найден/u);
});

test('bridge-debts: render→parse round-trip сохраняет долги', () => {
  const d = parseDebts(SAMPLE);
  assert.deepEqual(parseDebts(renderDebts(d)), d);
});

test('bridge-debts: боевой DEBTS.md — ≥7 долгов, у каждого вещдок (append-only растёт)', () => {
  const md = readFileSync(new URL('../docs/bridge/DEBTS.md', import.meta.url), 'utf8');
  const debts = parseDebts(md);
  assert.ok(debts.length >= 7, `стартовый набор ≥7 (22.07), сейчас ${debts.length}`);
  for (const d of debts) assert.ok(d.evidence.trim().length > 0, `у долга ${d.id} есть вещдок`);
});

// ─── Б4: провод в вечерний ритуал ───────────────────────────────────────────────

test('провод Б4: bridge-close — первый шаг вечернего манифеста, некритичный', () => {
  const manifest = JSON.parse(readFileSync(new URL('../docs/tasks/evening-ritual-steps.json', import.meta.url), 'utf8'));
  const step = manifest.steps.find((s) => s.id === 'bridge-close');
  assert.ok(step, 'шаг bridge-close есть в цепочке');
  assert.equal(manifest.steps[0].id, 'bridge-close', 'закрытие комнаты — первым');
  assert.equal(step.criticality, 'noncritical', 'не роняет вечерний ритуал');
  assert.match(step.script, /bridge\.mjs close/u);
});

test('провод Б5: bridge — жилец реестра процедур, держатель angelina', () => {
  const reg = JSON.parse(readFileSync(new URL('../docs/procedures/registry.json', import.meta.url), 'utf8'));
  const p = reg.procedures.find((x) => x.id === 'bridge');
  assert.ok(p, 'bridge зарегистрирован');
  assert.equal(p.holder, 'angelina');
});
