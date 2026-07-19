import assert from 'node:assert/strict';
import test from 'node:test';

import { SUBAGENT_KINDS } from './lib/angelina-delegate.mjs';
import { isValid } from './lib/angelina-validate.mjs';

const { ANALYST, SCRIBE } = SUBAGENT_KINDS;

// Фикстурные возвраты — стабы реальных субагентов (зона блока lead-persona).
const validAnalystReturn = () => ({
  'фактура': 'в реестре 213 карточек, поле leadPersona заполнено у 212',
  'источник': 'docs/tasks/registry.json @ HEAD рабочей ветки',
  'пробелы': ['не проверена ветка night-triage'],
});

const validScribeReturn = () => ({
  'дифф': '+ тезис T7 «предикат делегирования булев» внесён в THESES.md',
  'что_открыто': ['T8 ждёт подтверждения владельца'],
});

// --- аналитик ---

test('analyst: валидный возврат проходит', () => {
  const result = isValid(validAnalystReturn(), ANALYST);
  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
});

test('analyst: пустые "пробелы" легальны — «пробелов не вижу» тоже вердикт', () => {
  const ret = { ...validAnalystReturn(), 'пробелы': [] };
  assert.equal(isValid(ret, ANALYST).valid, true);
});

for (const field of ['фактура', 'источник', 'пробелы']) {
  test(`analyst: отсутствие поля "${field}" отвергается с перечислением`, () => {
    const ret = validAnalystReturn();
    delete ret[field];
    const result = isValid(ret, ANALYST);
    assert.equal(result.valid, false);
    assert.deepEqual(result.missing, [field]);
  });
}

test('analyst: пустая "фактура" отвергается — содержательное поле обязано быть непустым', () => {
  const blank = { ...validAnalystReturn(), 'фактура': '   ' };
  assert.equal(isValid(blank, ANALYST).valid, false);
  assert.deepEqual(isValid(blank, ANALYST).missing, ['фактура']);
});

test('analyst: "источник" не указан (пустая строка) — отвергается', () => {
  const ret = { ...validAnalystReturn(), 'источник': '' };
  const result = isValid(ret, ANALYST);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['источник']);
});

// --- писарь ---

test('scribe: валидный возврат проходит', () => {
  const result = isValid(validScribeReturn(), SCRIBE);
  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
});

test('scribe: пустое "что_открыто" легально', () => {
  const ret = { ...validScribeReturn(), 'что_открыто': [] };
  assert.equal(isValid(ret, SCRIBE).valid, true);
});

for (const field of ['дифф', 'что_открыто']) {
  test(`scribe: отсутствие поля "${field}" отвергается с перечислением`, () => {
    const ret = validScribeReturn();
    delete ret[field];
    const result = isValid(ret, SCRIBE);
    assert.equal(result.valid, false);
    assert.deepEqual(result.missing, [field]);
  });
}

test('scribe: пустой "дифф" отвергается', () => {
  const ret = { ...validScribeReturn(), 'дифф': '' };
  assert.equal(isValid(ret, SCRIBE).valid, false);
});

// --- общие правила ---

test('свободный текст возвратом не является — отвергается целиком (оба рода)', () => {
  const freeText = 'я всё посмотрел, вроде нормально';
  const analyst = isValid(freeText, ANALYST);
  assert.equal(analyst.valid, false);
  assert.deepEqual(analyst.missing, ['фактура', 'источник', 'пробелы']);

  const scribe = isValid(freeText, SCRIBE);
  assert.equal(scribe.valid, false);
  assert.deepEqual(scribe.missing, ['дифф', 'что_открыто']);
});

test('null и массив возвратом не являются', () => {
  assert.equal(isValid(null, ANALYST).valid, false);
  assert.equal(isValid(['фактура'], SCRIBE).valid, false);
});

test('возврат чужого рода отвергается: у аналитика нет диффа', () => {
  const result = isValid(validAnalystReturn(), SCRIBE);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['дифф', 'что_открыто']);
});

test('неизвестный род — наблюдаемая ошибка вызывающего', () => {
  assert.throws(() => isValid(validAnalystReturn(), 'jester'), TypeError);
  assert.throws(() => isValid(validAnalystReturn(), undefined), TypeError);
});

test('чистота: isValid не мутирует возврат', () => {
  const ret = validAnalystReturn();
  const snapshot = structuredClone(ret);
  isValid(ret, ANALYST);
  assert.deepEqual(ret, snapshot);
});
