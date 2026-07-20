/**
 * Юнит-тесты стендапа Тимлида (S, вердикт M3). Чистые функции — без сети/моков.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { standup, handoff, classifyAssignment, ASSIGNMENT_STATE, STANDUP_AUTHOR } from './lib/standup-plan.mjs';

const engine = { tasks: { 'DRU-1': { exists: true }, 'DRU-2': { exists: true } } };

test('classifyAssignment: три состояния — назначено / пробел / осиротело', () => {
  assert.equal(classifyAssignment({ owner: 'dynin', taskRef: 'DRU-1' }, engine), ASSIGNMENT_STATE.ASSIGNED);
  assert.equal(classifyAssignment({ owner: 'dynin', taskRef: 'DRU-9' }, engine), ASSIGNMENT_STATE.GAP, 'нет живой задачи');
  assert.equal(classifyAssignment({ owner: 'dynin', taskRef: null }, engine), ASSIGNMENT_STATE.GAP, 'намерение без задачи');
  assert.equal(classifyAssignment({ owner: null, taskRef: 'DRU-1' }, engine), ASSIGNMENT_STATE.ORPHAN, 'задача без владельца');
});

test('standup: автор — vesnin, детерминированный порядок по order', () => {
  const di = { intents: [
    { owner: 'dynin', taskRef: 'DRU-2', intent: 'b', order: 2 },
    { owner: 'ozhegov', taskRef: 'DRU-1', intent: 'a', order: 1 },
  ] };
  const plan = standup(di, engine);
  assert.equal(plan.author, STANDUP_AUTHOR);
  assert.deepEqual(plan.assignments.map((a) => a.taskRef), ['DRU-1', 'DRU-2'], 'по order');
  assert.equal(plan.assignments.every((a) => a.state === ASSIGNMENT_STATE.ASSIGNED), true);
});

test('standup: детерминизм — тот же вход и снимок → тот же план', () => {
  const di = { intents: [{ owner: 'dynin', taskRef: 'DRU-1', intent: 'x' }] };
  assert.deepEqual(standup(di, engine), standup(di, engine));
});

test('standup: emptyPlan при непустом Day Issue без назначений (анти-«молчун»)', () => {
  const di = { intents: [{ owner: 'dynin', taskRef: 'DRU-404', intent: 'нет задачи' }] };
  const plan = standup(di, engine);
  assert.equal(plan.emptyPlan, true, 'есть намерения, но ноль назначено');
  assert.equal(plan.assignments[0].state, ASSIGNMENT_STATE.GAP);
});

test('standup: пустой Day Issue → emptyPlan false (нечему быть пустым)', () => {
  assert.equal(standup({ intents: [] }, engine).emptyPlan, false);
  assert.equal(standup({}, engine).emptyPlan, false);
});

test('standup: движок читается как снимок — стендап задачи НЕ создаёт (нет живой → пробел)', () => {
  const plan = standup({ intents: [{ owner: 'dynin', taskRef: 'DRU-NEW', intent: 'создать' }] }, { tasks: {} });
  assert.equal(plan.assignments[0].state, ASSIGNMENT_STATE.GAP, 'несуществующая задача не создаётся, помечается пробелом');
});

test('handoff: проекция на персону — ссылки, не копии; только назначенные', () => {
  const di = { intents: [
    { owner: 'dynin', taskRef: 'DRU-1', intent: 'a', order: 1 },
    { owner: 'dynin', taskRef: 'DRU-2', intent: 'b', order: 2 },
    { owner: 'ozhegov', taskRef: 'DRU-9', intent: 'gap' }, // пробел — не в handoff
  ] };
  const plan = standup(di, engine);
  const h = handoff(plan, 'dynin', { revision: 'abc123' });
  assert.deepEqual(h.assignments, ['DRU-1', 'DRU-2'], 'ссылки на задачи по order');
  assert.deepEqual(h.memoryRef, { persona: 'dynin', revision: 'abc123' });
  assert.equal(h.planRef, STANDUP_AUTHOR);
});

test('handoff: персона без назначений → undefined (кеша не существует)', () => {
  const plan = standup({ intents: [{ owner: 'dynin', taskRef: 'DRU-1', intent: 'a' }] }, engine);
  assert.equal(handoff(plan, 'kuryokhin'), undefined);
  assert.equal(handoff(plan, 'ozhegov'), undefined);
});

test('handoff: revision по умолчанию null (граница чистоты — git снаружи)', () => {
  const plan = standup({ intents: [{ owner: 'dynin', taskRef: 'DRU-1', intent: 'a' }] }, engine);
  assert.equal(handoff(plan, 'dynin').memoryRef.revision, null);
});
