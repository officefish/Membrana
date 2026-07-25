import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDebts, renderDebts, addDebt, settleDebt, supersedeDebt } from './lib/bridge-debts.mjs';

test('parse/render round-trip с темой (M1) и обратная совместимость 5-колонок', () => {
  const md = [
    '| id | долг | вещдок | статус | дата | тема |',
    '|----|------|--------|--------|------|------|',
    '| a | текст | ev | open | 2026-07-25 | каналы-LLM |',
    '| b | старый 5-кол | ev2 | settled | 2026-07-22 |', // legacy без темы
  ].join('\n');
  const debts = parseDebts(md);
  assert.equal(debts[0].theme, 'каналы-LLM');
  assert.equal(debts[1].theme, ''); // legacy → пустая тема
  // round-trip: render → parse даёт то же
  const again = parseDebts(renderDebts(debts));
  assert.equal(again[0].theme, 'каналы-LLM');
  assert.equal(again.length, 2);
});

test('supersedeDebt: старый settled, новый open со ссылкой и наследованной темой', () => {
  const debts = [{ id: 'x', debt: 'старая формулировка', evidence: 'e', status: 'open', date: '2026-07-22', theme: 'каналы-LLM' }];
  const next = supersedeDebt(debts, 'x', { debt: 'новая формулировка', evidence: 'обоснование', date: '2026-07-25' });
  const old = next.find((d) => d.id === 'x');
  const neu = next.find((d) => d.id === 'x-r2');
  assert.equal(old.status, 'settled');
  assert.equal(neu.status, 'open');
  assert.equal(neu.theme, 'каналы-LLM'); // унаследована
  assert.match(neu.evidence, /⟵ supersedes x/u); // нить
});

test('supersedeDebt: settled переформулировать нельзя; дубль id запрещён', () => {
  const debts = [
    { id: 'x', debt: 'a', evidence: 'e', status: 'settled', date: '2026-07-22', theme: '' },
    { id: 'y', debt: 'b', evidence: 'e', status: 'open', date: '2026-07-22', theme: '' },
    { id: 'y-r2', debt: 'c', evidence: 'e', status: 'open', date: '2026-07-25', theme: '' },
  ];
  assert.throws(() => supersedeDebt(debts, 'x', { debt: 'n', evidence: 'e', date: '2026-07-25' }), /уже settled/u);
  assert.throws(() => supersedeDebt(debts, 'y', { debt: 'n', evidence: 'e', date: '2026-07-25' }), /уже в реестре/u);
});

test('addDebt/settleDebt сохраняют тему', () => {
  const d1 = addDebt([], { id: 'a', debt: 't', evidence: 'e', date: '2026-07-25', theme: 'сны' });
  assert.equal(d1[0].theme, 'сны');
  const d2 = settleDebt(d1, 'a');
  assert.equal(d2[0].theme, 'сны');
  assert.equal(d2[0].status, 'settled');
});
