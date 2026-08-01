/**
 * Зуб правила 7 (заседание evening-review-predicate, 01.08): повестка, не доехавшая
 * до комнаты, — отказ ДО вызова API, а не предупреждение в stderr.
 *
 * Почему предикат, а не проверка «по факту прогона»: механизм, который печатает и
 * продолжает, гейтом не является. Прецедент 30.07 — две побайтово одинаковые повестки
 * дали брак и вердикт, и разница лежала ровно в доставке несущего содержания.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { AGENDA_INPUT_KIND, agendaDeliveryProblem } from './consilium.mjs';

const agenda = (delivery, path = 'docs/meeting/x/M1-topic.md') => ({
  kind: AGENDA_INPUT_KIND,
  path,
  delivery,
});

test('вне режима --meeting зуб молчит: в консилиуме обрезка входа законна', () => {
  assert.equal(agendaDeliveryProblem([agenda('не доехал')], false), null);
  assert.equal(agendaDeliveryProblem([agenda('обрезан')], false), null);
});

test('повестка доехала полностью → отказывать не за что', () => {
  assert.equal(agendaDeliveryProblem([agenda('полностью')], true), null);
});

test('повестка не доехала → находка с носителем и видом доставки', () => {
  const problem = agendaDeliveryProblem([agenda('не доехал')], true);
  assert.deepEqual(problem, {
    kind: AGENDA_INPUT_KIND,
    delivery: 'не доехал',
    path: 'docs/meeting/x/M1-topic.md',
  });
});

test('обрезанная повестка — тоже отказ: комната видела кусок и не знает, какой', () => {
  const problem = agendaDeliveryProblem([agenda('обрезан')], true);
  assert.equal(problem?.delivery, 'обрезан');
});

test('записи повестки в манифесте нет — НЕ предмет этого зуба (её ловит S-M1)', () => {
  const records = [{ kind: 'координация ролей', path: null, delivery: 'обрезан' }];
  assert.equal(agendaDeliveryProblem(records, true), null);
});

test('чужая потеря повестку не роняет: обрезан контекст, повестка цела', () => {
  const records = [
    agenda('полностью'),
    { kind: 'координация ролей', path: null, delivery: 'обрезан' },
    { kind: 'архив RAG', path: null, delivery: 'не доехал' },
  ];
  assert.equal(agendaDeliveryProblem(records, true), null);
});

test('пустой и отсутствующий манифест не роняют предикат', () => {
  assert.equal(agendaDeliveryProblem([], true), null);
  assert.equal(agendaDeliveryProblem(undefined, true), null);
  assert.equal(agendaDeliveryProblem(null, true), null);
});

test('носитель может быть неизвестен — path честно null, а не выдуман', () => {
  const problem = agendaDeliveryProblem([{ kind: AGENDA_INPUT_KIND, delivery: 'не доехал' }], true);
  assert.equal(problem?.path, null);
});
