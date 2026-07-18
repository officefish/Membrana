/**
 * Тесты барьера утреннего ритуала (вердикт morning-ritual-regulation 18.07).
 * Главный — ИНВАРИАНТ: фон НИКОГДА не проходит gate без решения владельца, при
 * ЛЮБОМ наборе решений (полный перебор). Это конструкция против проглоченного
 * гейта, и она обязана держаться на переборе, а не на одном примере.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { canAdvance, hasDecision, advanceFrontier, ritualStatus } from './lib/morning-ritual.mjs';

const STEPS = JSON.parse(readFileSync(new URL('../docs/tasks/morning-ritual-steps.json', import.meta.url))).steps;

test('манифест: 8+ шагов, каждый kind ∈ {mechanic, gate}, gate несёт blocksOn', () => {
  assert.ok(STEPS.length >= 8);
  for (const s of STEPS) {
    assert.ok(s.kind === 'mechanic' || s.kind === 'gate', `${s.id}: kind`);
    if (s.kind === 'gate') assert.ok(s.blocksOn, `${s.id}: gate обязан объявить blocksOn`);
  }
});

test('canAdvance: mechanic всегда проходит, gate — только с решением', () => {
  assert.equal(canAdvance({ id: 'm', kind: 'mechanic' }, {}), true);
  assert.equal(canAdvance({ id: 'g', kind: 'gate' }, {}), false);
  assert.equal(canAdvance({ id: 'g', kind: 'gate' }, { decisions: { g: 'да' } }), true);
});

test('hasDecision: пусто/null/undefined/"" — решения НЕТ', () => {
  assert.equal(hasDecision('g', {}), false);
  assert.equal(hasDecision('g', { decisions: {} }), false);
  assert.equal(hasDecision('g', { decisions: { g: null } }), false);
  assert.equal(hasDecision('g', { decisions: { g: undefined } }), false);
  assert.equal(hasDecision('g', { decisions: { g: '' } }), false);
  assert.equal(hasDecision('g', { decisions: { g: 'выбор' } }), true);
  assert.equal(hasDecision('g', { decisions: { g: false } }), true); // явное «нет» = решение
  assert.equal(hasDecision('g', { decisions: { g: 0 } }), true);
});

test('неизвестный kind — консервативно СТОП (не молча пропускаем)', () => {
  assert.equal(canAdvance({ id: 'x', kind: 'weird' }, { decisions: { x: 'y' } }), false);
});

test('ИНВАРИАНТ (полный перебор): фон НИКОГДА не проходит gate без решения', () => {
  const gates = STEPS.filter((s) => s.kind === 'gate').map((s) => s.id);
  // 2^gates наборов решений — все комбинации «решено/не решено»
  for (let mask = 0; mask < (1 << gates.length); mask += 1) {
    const decisions = {};
    gates.forEach((id, bit) => { if (mask & (1 << bit)) decisions[id] = 'решено'; });
    const state = { decisions };
    const { advanced } = advanceFrontier(STEPS, state);
    // всё, что фон прошёл (i < advanced), либо mechanic, либо gate С решением
    for (let i = 0; i < advanced; i += 1) {
      const s = STEPS[i];
      if (s.kind === 'gate') {
        assert.ok(hasDecision(s.id, state), `фон прошёл gate ${s.id} БЕЗ решения (mask=${mask}) — барьер пробит`);
      }
    }
    // и фронтир стоит ровно на первом невыполнимом шаге
    if (advanced < STEPS.length) {
      assert.equal(canAdvance(STEPS[advanced], state), false, `фронтир не на барьере (mask=${mask})`);
    }
  }
});

test('монотонность: решить ПОЗДНИЙ гейт, не решив ранний, — фронтир НЕ сдвигается', () => {
  const gates = STEPS.filter((s) => s.kind === 'gate');
  if (gates.length >= 2) {
    const decisions = { [gates[gates.length - 1].id]: 'решено' }; // решён только последний
    const { blockedAt } = advanceFrontier(STEPS, { decisions });
    assert.equal(blockedAt?.id, gates[0].id, 'фон обязан стоять на ПЕРВОМ нерешённом гейте, не перепрыгивать');
  }
});

test('идемпотентность: тот же вход → тот же выход (чистая функция)', () => {
  const state = { decisions: { magistral: 'x' } };
  assert.deepEqual(advanceFrontier(STEPS, state), advanceFrontier(STEPS, state));
  assert.deepEqual(ritualStatus(STEPS, state), ritualStatus(STEPS, state));
});

test('витрина: disabled НЕ выдаётся за done (молчун-защита) — за барьером всё disabled', () => {
  const status = ritualStatus(STEPS, {}); // ноль решений
  const firstGate = STEPS.findIndex((s) => s.kind === 'gate');
  // до первого гейта — done (механика прошла); на гейте — active-gate; после — disabled, НЕ done
  for (let i = firstGate + 1; i < status.length; i += 1) {
    assert.notEqual(status[i].status, 'done', `${status[i].id} за незакрытым гейтом выдан за done`);
  }
  assert.equal(status[firstGate].status, 'active-gate');
});
