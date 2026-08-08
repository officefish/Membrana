/**
 * Зубы словаря персон процедур (ADR-0025 Р2, блок personas-dictionary).
 *
 * Главный зуб здесь — отношение включения. Списки перечислены не оба, а один: второй
 * вычисляется. Проверять надо именно это свойство, потому что через полгода кто-то
 * напишет `MODERATOR_PERSONAS = [...]` руками, и без зуба мы узнаем об этом от сломанного
 * шота, а не от CI (разбор Дынина 08.08).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  HOLDER_PERSONAS,
  MODERATOR_PERSONAS,
  holderProblem,
  isHolderPersona,
  isModeratorPersona,
} from './lib/procedure-personas.mjs';

test('модераторы включают держателей целиком — отношение ⊇, а не совпадение списков', () => {
  for (const p of HOLDER_PERSONAS) {
    assert.ok(MODERATOR_PERSONAS.includes(p), `${p} обязан быть допущен вести момент`);
  }
  assert.ok(MODERATOR_PERSONAS.includes('angelina'), 'ведущая обязана быть модератором');
  assert.equal(MODERATOR_PERSONAS.length, HOLDER_PERSONAS.length + 1, 'модераторы = держатели + ведущая, без лишних');
});

test('оба списка заморожены — правка на месте невозможна', () => {
  assert.ok(Object.isFrozen(HOLDER_PERSONAS));
  assert.ok(Object.isFrozen(MODERATOR_PERSONAS));
});

test('ведущая НЕ держатель — это и есть предмет ADR-0025', () => {
  assert.equal(isHolderPersona('angelina'), false);
  assert.equal(isModeratorPersona('angelina'), true);
});

test('тимлид в держателях — иначе сломается executor шота', () => {
  // scripts/lib/one-shot-run.mjs сверяет executor шота этим списком; кадр execute держит
  // тимлид (Т4 шторма 03.08). Состав взят из ADR-0025 Р2 (строка 76), не расширен резчиком.
  assert.ok(HOLDER_PERSONAS.includes('tarasov'));
});

test('разработчики — держатели все до одного', () => {
  for (const p of ['vesnin', 'ozhegov', 'dynin', 'kuryokhin', 'rodchenko', 'tarasov']) {
    assert.equal(isHolderPersona(p), true, `${p} обязан быть держателем`);
  }
});

test('не-строка держателем не становится', () => {
  for (const bad of [null, undefined, 42, {}, ['vesnin']]) {
    assert.equal(isHolderPersona(bad), false);
    assert.equal(isModeratorPersona(bad), false);
  }
});

// ─── причина отказа названа, а не «∉ список» ─────────────────────────────────────

test('модератор в holder получает СВОЮ причину: у фрейма не будет исполнителя', () => {
  const why = holderProblem('angelina');
  assert.match(why, /модератор/);
  assert.match(why, /кода не пишет/);
  assert.match(why, /moderator/, 'отказ обязан назвать, куда переложить роль');
});

test('посторонний в holder получает обычную причину со списком', () => {
  const why = holderProblem('нектоиз');
  assert.match(why, /HOLDER_PERSONAS/);
  assert.ok(!/модератор/.test(why), 'посторонний — не модератор, причины не путаем');
});

test('годный держатель причины не имеет', () => {
  assert.equal(holderProblem('dynin'), null);
});

// ─── края, названные Дыниным при ревью блока ─────────────────────────────────────

test('в модераторах нет дублей — иначе |MOD| = |HOLD|+1 пройдёт по длине и соврёт', () => {
  // Край: если 'angelina' попадёт в сам HOLDER_PERSONAS, объединение даст дубль,
  // сравнение множеств его стерпит, а проверка длины — пройдёт. Зуб закрывает щель.
  assert.equal(new Set(MODERATOR_PERSONAS).size, MODERATOR_PERSONAS.length);
  assert.equal(new Set(HOLDER_PERSONAS).size, HOLDER_PERSONAS.length);
  assert.equal(HOLDER_PERSONAS.includes('angelina'), false, 'ведущая в держателях — тот самый дубль');
});

test('holderProblem детерминирована: одна персона — одна и та же строка', () => {
  for (const p of ['angelina', 'нектоиз', 42, null]) {
    assert.equal(holderProblem(p), holderProblem(p));
  }
});
