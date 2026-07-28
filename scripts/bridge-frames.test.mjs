/**
 * Зубы несущего каркаса мостика (очередь 1 стройки #1351; вердикты M1/M2 заседания
 * bridge-command-post, ратифицированы 27.07). DoD M2 п.3 + DoD M1 п.4:
 *   presence не открывает · open открывает · debts∧¬parrot ⇒ отказ open ·
 *   close идемпотентен · close ⇏ conspect · declared ⇒ resolvable ∨ explicitAbsent ·
 *   parrot не маскируется под llm-persona · scribe не подписывается angelina.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { castResolveProblems, castSchemaProblems, signatureProblem } from './lib/bridge-cast.mjs';
import { CLOSED, awaitCaptain, closeRoom, isOpen, normalizeState, openRoom, resumeFree } from './lib/bridge-room.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cast = JSON.parse(readFileSync(join(ROOT, 'docs/bridge/cast.json'), 'utf8'));
const frames = JSON.parse(readFileSync(join(ROOT, 'docs/bridge/frames.manifest.json'), 'utf8'));

// --- КА фаз (M2) ---

test('presence не открывает: фазу меняет только явная open-команда', () => {
  // presence в адаптере не трогает состояние вовсе — ядро это гарантирует тем,
  // что единственный переход idle→free есть openRoom (явная команда).
  const s = { ...CLOSED };
  assert.equal(isOpen(s), false);
  const r = openRoom(s, { day: '2026-07-28' });
  assert.equal(r.opened, true);
  assert.equal(r.state.phase, 'free');
});

test('повторный open — идемпотентный no-op со статусом', () => {
  const r1 = openRoom({ ...CLOSED }, { day: '2026-07-28' });
  const r2 = openRoom(r1.state, { day: '2026-07-28' });
  assert.equal(r2.already, true);
  assert.equal(r2.state, r1.state);
});

test('await_captain — wait из free, отказ из закрытых; слово возвращает в free', () => {
  const open = openRoom({ ...CLOSED }, { day: '2026-07-28' }).state;
  const w = awaitCaptain(open);
  assert.equal(w.waited, true);
  assert.equal(w.state.phase, 'await_captain');
  assert.equal(isOpen(w.state), true, 'ожидание — живое тело сеанса, не закрытие');
  const r = resumeFree(w.state);
  assert.equal(r.state.phase, 'free');
  assert.equal(awaitCaptain({ ...CLOSED }).waited, false, 'await из idle — отказ');
});

test('close идемпотентен и ведёт в sealed; повторный close — честный no-op', () => {
  const open = openRoom({ ...CLOSED }, { day: '2026-07-28' }).state;
  const c1 = closeRoom(open);
  assert.equal(c1.closed, true);
  assert.equal(c1.state.phase, 'sealed');
  const c2 = closeRoom(c1.state);
  assert.equal(c2.closed, false, 'закрытие закрытого — no-op, не второй seal');
});

test('normalizeState: легаси opened/closed мигрирует в free/idle', () => {
  assert.equal(normalizeState({ phase: 'opened', day: 'd', openedBy: 'cap' }).phase, 'free');
  assert.equal(normalizeState({ phase: 'closed' }).phase, 'idle');
  assert.equal(normalizeState(null).phase, 'idle');
});

// --- BridgeCast (M1) ---

test('cast.json: схема полна, три записи, попугай не маскируется', () => {
  const problems = castSchemaProblems(cast);
  assert.deepEqual(problems, []);
  assert.equal(cast.entries.length, 3);
  const parrot = cast.entries.find((e) => e.id === 'parrot');
  assert.equal(parrot.carrier, 'kit-engine', 'память долгов несёт движок, не LLM-персона');
});

test('маскировка ловится схемой: parrot как llm-persona — красный', () => {
  const fake = { entries: cast.entries.map((e) => (e.id === 'parrot' ? { ...e, carrier: 'llm-persona' } : e)) };
  assert.ok(castSchemaProblems(fake).some((p) => p.includes('маскируется')));
});

test('инвариант M1: declared ⇒ resolvable ∨ explicitAbsent', () => {
  const allResolve = castResolveProblems(cast, { resolve: () => true });
  assert.deepEqual(allResolve.problems, []);

  const noneResolve = castResolveProblems(cast, { resolve: () => false });
  assert.equal(noneResolve.problems.length, 3, 'нерезолв без absent — нарушение по каждому');

  const absent = castResolveProblems(cast, { resolve: () => false, absent: new Set(['angelina', 'farrell', 'parrot']) });
  assert.deepEqual(absent.problems, [], 'явный absent — легальное состояние, не нарушение');
  assert.equal(absent.statuses.angelina, 'explicitAbsent');
});

test('подпись именем без носителя запрещена; session-scribe легален всегда', () => {
  const statuses = { angelina: 'explicitAbsent', farrell: 'resolvable', parrot: 'resolvable' };
  assert.ok(signatureProblem('angelina', statuses)?.includes('25.07'), 'absent lead — подпись её именем красная');
  assert.equal(signatureProblem('farrell', statuses), null);
  assert.equal(signatureProblem('session-scribe', statuses), null);
  assert.equal(signatureProblem('cap', statuses), null, 'не-участник cast — не предмет правила');
});

// --- Манифест фреймов (M2, DoD п.1) ---

test('манифест: 5 фреймов, 5 гейтов, 5 домов, фазы M2, без TBD на mandatory', () => {
  assert.equal(frames.frames.length, 5);
  assert.equal(frames.gates.length, 5);
  assert.equal(frames.homes.length, 5);
  assert.deepEqual(frames.phases, ['idle', 'open', 'free', 'await_captain', 'close', 'sealed']);
  for (const f of frames.frames) {
    assert.equal(typeof f.mandatory, 'boolean', `${f.id}: mandatory без TBD`);
    assert.ok(f.carrier && f.home, `${f.id}: закон frame ⇒ carrier ∧ home`);
  }
  const gateIds = frames.gates.map((g) => g.id);
  for (const g of ['gate.presence_is_not_trigger', 'gate.cast_resolvable', 'gate.parrot_live_if_debts', 'gate.await_captain', 'gate.close_carrier']) {
    assert.ok(gateIds.includes(g), `нет гейта ${g}`);
  }
});
