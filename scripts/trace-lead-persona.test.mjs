import assert from 'node:assert/strict';
import test from 'node:test';

import { EXIT_OK, EXIT_REFUSAL, traceResult, VERDICT_TO_CODE } from './lib/trace-exit-codes.mjs';
import { checkLeadPersona, checkLeadPersonaBatch } from './lib/trace-lead-persona.mjs';

test('отказ отличается кодом, не тоном: verdict → code', () => {
  assert.equal(VERDICT_TO_CODE.pass, EXIT_OK);
  assert.equal(VERDICT_TO_CODE.soft, EXIT_OK);
  assert.equal(VERDICT_TO_CODE.hard, EXIT_REFUSAL);
  assert.throws(() => traceResult('warning', 'нет такого вердикта'));
});

test('отказ-I: leadPersona есть → pass, exit 0', () => {
  const r = checkLeadPersona({ id: 'task-1', leadPersona: 'vesnin' });
  assert.equal(r.code, EXIT_OK);
  assert.equal(r.verdict, 'pass');
});

test('отказ-I: leadPersona пуст → hard, exit 1 (null | undefined | пустая строка | пробелы)', () => {
  for (const leadPersona of [null, undefined, '', '   ']) {
    const r = checkLeadPersona({ id: 'task-x', leadPersona });
    assert.equal(r.code, EXIT_REFUSAL, `leadPersona=${JSON.stringify(leadPersona)}`);
    assert.equal(r.verdict, 'hard');
    assert.match(r.reason, /leadPersona пуст/);
  }
});

test('отказ-I: отсутствие карточки — hard, не молчание', () => {
  assert.equal(checkLeadPersona(null).code, EXIT_REFUSAL);
  assert.equal(checkLeadPersona(undefined).code, EXIT_REFUSAL);
});

test('отказ-I: детерминизм — тот же вход, тот же результат бит-в-бит', () => {
  const card = { id: 'task-1', leadPersona: 'kuryokhin' };
  assert.deepEqual(checkLeadPersona(card), checkLeadPersona(card));
});

test('сценарий фактуры M2: 213 карточек, 212 с leadPersona → ровно один hard', () => {
  const cards = Array.from({ length: 212 }, (_, i) => ({
    id: `task-${i + 1}`,
    leadPersona: ['vesnin', 'ozhegov', 'dynin', 'kuryokhin', 'rodchenko'][i % 5],
  }));
  cards.push({ id: 'task-213', leadPersona: null }); // та самая одна карточка без поля

  const batch = checkLeadPersonaBatch(cards);
  assert.equal(batch.checked, 213);
  assert.equal(batch.failures.length, 1);
  assert.match(batch.failures[0].reason, /task-213/);
  assert.equal(batch.verdict, 'hard');
  assert.equal(batch.code, EXIT_REFUSAL);
});

test('батч: все 213 с leadPersona → pass, exit 0 (цена включения ноль)', () => {
  const cards = Array.from({ length: 213 }, (_, i) => ({ id: `task-${i + 1}`, leadPersona: 'vesnin' }));
  const batch = checkLeadPersonaBatch(cards);
  assert.equal(batch.code, EXIT_OK);
  assert.equal(batch.verdict, 'pass');
  assert.equal(batch.failures.length, 0);
});

test('батч: не-массив на входе — hard, наблюдаемый провал', () => {
  const batch = checkLeadPersonaBatch(/** @type {any} */ (null));
  assert.equal(batch.code, EXIT_REFUSAL);
  assert.equal(batch.checked, 0);
});
