import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { compileCategories, decompose, formatTable } from './lib/tasks-decompose.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CATS = compileCategories({
  categories: [
    { name: 'Альфа', patterns: ['^a-'] },
    { name: 'Всё на b и a-строго', patterns: ['^b-', '^a-strict'] },
  ],
});

test('первая совпавшая категория забирает карточку (порядок конфига значим)', () => {
  // a-strict-1 матчится обеими — уходит в первую («Альфа»), не во вторую.
  const { buckets } = decompose([{ id: 'a-strict-1' }], CATS);
  assert.equal(buckets[0].tasks.length, 1);
  assert.equal(buckets[1].tasks.length, 0);
});

test('карточка без совпадений уходит в unassigned, не теряется и не прячется', () => {
  const r = decompose([{ id: 'a-1' }, { id: 'zzz' }, { id: 'b-2' }], CATS);
  assert.deepEqual(r.unassigned.map((t) => t.id), ['zzz']);
  assert.equal(r.buckets[0].tasks.length + r.buckets[1].tasks.length + r.unassigned.length, r.total);
});

test('таблица — обязательный формат: заголовок, строки категорий, итог, ВНЕ КАТЕГОРИЙ', () => {
  const r = decompose([{ id: 'a-1' }, { id: 'orphan' }], CATS);
  const table = formatTable(r);
  assert.match(table, /^\| № \| Категория \| Карточек \| Доля \| Примеры \|/);
  assert.match(table, /\| 1 \| Альфа \| 1 \| 50% \| `a-1` \|/);
  assert.match(table, /ВНЕ КАТЕГОРИЙ .*\| 1 \| 50% \| `orphan` \|/);
  assert.match(table, /\*\*Итого\*\* \| \*\*2\*\*/);
});

test('examples ограничивает примеры и ставит многоточие; 0 — прочерк', () => {
  const tasks = [{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }];
  const r = decompose(tasks, CATS);
  assert.match(formatTable(r, { examples: 2 }), /`a-1`, `a-2`, …/);
  assert.match(formatTable(r, { examples: 0 }), /\| 1 \| Альфа \| 3 \| 100% \| — \|/);
});

test('пустой вход: доли «—», итог 0, таблица не падает', () => {
  const table = formatTable(decompose([], CATS));
  assert.match(table, /\| 1 \| Альфа \| 0 \| — \| — \|/);
  assert.match(table, /\*\*Итого\*\* \| \*\*0\*\*/);
});

test('битый конфиг — ошибка, а не тихий пустой результат', () => {
  assert.throws(() => compileCategories({ categories: [] }), /≥2 категорий/);
  assert.throws(() => compileCategories({ categories: [{ name: 'x', patterns: [] }, { name: 'y', patterns: ['^y'] }] }), /без name или patterns/);
});

test('боевой конфиг валиден: парсится, ≥2 категорий, все regexp компилируются', () => {
  const raw = JSON.parse(readFileSync(join(repoRoot, 'scripts', 'tasks-decompose.config.json'), 'utf8'));
  const cats = compileCategories(raw);
  assert.ok(cats.length >= 2);
});
