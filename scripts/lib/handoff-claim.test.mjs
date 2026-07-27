/**
 * Зуб handoff-claim: занять свободное, не перетирать чужое, честно падать без якоря.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { claimNote, claimRow } from './handoff-claim.mjs';

const MD = [
  '| # | Работа | Размер | Занято |',
  '|---|--------|--------|--------|',
  '| 1 | Полиси | S | дерево `X` — сверить скоуп |',
  '| 2 | Автослияние | XS | свободно |',
  '',
  '**Ниже черты (живое):** прочее.',
].join('\n');

test('claimRow: свободная строка занимается жирной отметкой', () => {
  const { md, error } = claimRow(MD, 2, 'агент А, дерево `Membrana-delivery`');
  assert.equal(error, null);
  assert.match(md, /\| 2 \| Автослияние \| XS \| \*\*агент А, дерево `Membrana-delivery`\*\* \|/u);
});

test('claimRow: занятая строка НЕ перетирается — отказ называет текущего держателя', () => {
  const { md, error, was } = claimRow(MD, 1, 'агент Б');
  assert.equal(md, null);
  assert.match(error, /уже занята/u);
  assert.match(was, /дерево `X`/u);
});

test('claimRow: несуществующий номер — отказ с перечислением формы поиска', () => {
  const { error } = claimRow(MD, 9, 'кто-то');
  assert.match(error, /не найдена/u);
});

test('claimNote: блок встаёт перед «Ниже черты»', () => {
  const { md, error } = claimNote(MD, 'контур доставки — агент А');
  assert.equal(error, null);
  assert.ok(md.indexOf('**Занято:** контур доставки') < md.indexOf('**Ниже черты'));
});

test('claimNote: без якоря — честный отказ, не молчаливый аппенд', () => {
  const { error } = claimNote('# пусто', 'x');
  assert.match(error, /не найден/u);
});
