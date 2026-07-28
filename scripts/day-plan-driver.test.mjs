/**
 * Зубы драйвера канона дня (#1363): чистые функции без сети/ФС.
 * Стенка Slot → Text и правила Q1 держатся тестом, не памятью.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildContext, buildSlotPrompt, gatherPremises } from './day-plan.mjs';

const REG = [
  { id: 'b-tool', status: 'active', size: 'L', zone: 'tooling' },
  { id: 'a-prod', status: 'active', size: 'L', zone: 'product' },
  { id: 'c-dead', status: 'archived', size: 'L', zone: 'product' },
  { id: 'd-mid', status: 'active', size: 'M', zone: 'business' },
];

test('buildContext: top-3 из активных L, архивные не лезут; фолбэк на M при пустых L', () => {
  const ctx = buildContext({ registryTasks: REG });
  assert.ok(ctx.top3.length >= 2);
  assert.ok(!ctx.top3.some((c) => c.id === 'c-dead'), 'архивная карточка попала в кандидаты');

  const ctxM = buildContext({ registryTasks: [{ id: 'm1', status: 'active', size: 'M', zone: 'tooling' }] });
  assert.equal(ctxM.top3.length, 1, 'фолбэк на M не сработал');
});

test('buildSlotPrompt: стенка Slot→Text — структурные поля не утекают, Q1 в тексте', () => {
  const ctx = buildContext({ registryTasks: REG, handoff: 'HANDOFF-BODY', horizon: 'VEHA' });
  const p = buildSlotPrompt('magistral', ctx);
  assert.ok(!/order|title/.test(p), 'структурные поля слота утекли в промпт');
  assert.ok(p.includes('без DoD'), 'запрет Q1 (DoD) не в промпте');
  assert.ok(p.includes('owner-choice'), 'магистраль не защищена owner-choice');
  assert.ok(p.includes('VEHA') && p.includes('HANDOFF-BODY'), 'живые источники не поданы');
});

test('gatherPremises: посылки честно называют отсутствующие источники', () => {
  const prem = gatherPremises({ handoff: null, horizon: null, feedback: null }, []);
  assert.ok(prem.some((s) => s.includes('отсутствует')), 'отсутствие источника не названо');
  assert.ok(prem.some((s) => s.includes('слово') && s.includes('владельца')), 'owner-гейт не в посылках');
});
