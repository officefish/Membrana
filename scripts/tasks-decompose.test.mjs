import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  AXES,
  ageDays,
  collectByAxes,
  compileAxis,
  compileCategories,
  decompose,
  decomposeByAxis,
  formatTable,
  renderReport,
  resolveAxis,
} from './lib/tasks-decompose.mjs';

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
  assert.throws(
    () => compileCategories({ categories: [{ name: 'x', patterns: [] }, { name: 'y', patterns: ['^y'] }] }),
    /без name или patterns/,
  );
});

test('renderReport: Meta из пар, Summary-таблица, полные списки, ВНЕ КАТЕГОРИЙ', () => {
  const r = decompose(
    [
      { id: 'a-1', size: 'M', githubIssue: 42, title: 'Альфа-задача' },
      { id: 'orphan' },
    ],
    CATS,
  );
  const md = renderReport(r, { Date: '2026-07-21', Active: '2' });
  assert.match(md, /\| Date \| 2026-07-21 \|/);
  assert.match(md, /## Summary/);
  assert.match(md, /## Альфа \(1\)\n\n- `a-1` \[M\] #42 — Альфа-задача/);
  assert.match(md, /## ВНЕ КАТЕГОРИЙ \(1\) — дополнить конфиг\n\n- `orphan` — /);
});

test('боевой конфиг валиден: парсится, ≥2 категорий, все regexp компилируются', () => {
  const raw = JSON.parse(readFileSync(join(repoRoot, 'scripts', 'tasks-decompose.config.json'), 'utf8'));
  const cats = compileCategories(raw);
  assert.ok(cats.length >= 2);
  assert.equal(raw.defaultAxis, 'category');
  for (const axis of AXES) {
    assert.doesNotThrow(() => compileAxis(raw, axis));
  }
});

test('resolveAxis: default category; две оси → отказ; health → отказ', () => {
  assert.equal(resolveAxis([]), 'category');
  assert.equal(resolveAxis(['size']), 'size');
  assert.throws(() => resolveAxis(['size', 'age']), /одна ось за прогон/);
  assert.throws(() => resolveAxis(['health']), /health отложена/);
  assert.throws(() => resolveAxis(['nope']), /неизвестная ось/);
});

test('collectByAxes: повторный --by и CSV считаются комбинацией', () => {
  assert.deepEqual(collectByAxes(['--by', 'size']), ['size']);
  assert.deepEqual(collectByAxes(['--by=age']), ['age']);
  assert.deepEqual(collectByAxes(['--by', 'size', '--by', 'age']), ['size', 'age']);
  assert.deepEqual(collectByAxes(['--by', 'size,age']), ['size', 'age']);
  assert.throws(() => resolveAxis(collectByAxes(['--by', 'size,lead'])), /одна ось за прогон/);
});

test('ось size: порядок из конфига; без size → ВНЕ КАТЕГОРИЙ', () => {
  const spec = compileAxis(
    { defaultAxis: 'category', categories: [{ name: 'x', patterns: ['^x'] }, { name: 'y', patterns: ['^y'] }], axes: { size: { order: ['S', 'M', 'L'] } } },
    'size',
  );
  const r = decomposeByAxis(
    [
      { id: 'a', size: 'M' },
      { id: 'b', size: 'S' },
      { id: 'c' },
      { id: 'd', size: 'XL' },
    ],
    spec,
  );
  assert.deepEqual(
    r.buckets.map((b) => [b.name, b.tasks.map((t) => t.id)]),
    [
      ['S', ['b']],
      ['M', ['a']],
      ['L', []],
      ['XL', ['d']],
    ],
  );
  assert.deepEqual(r.unassigned.map((t) => t.id), ['c']);
  assert.match(formatTable(r), /ВНЕ КАТЕГОРИЙ .*`c`/);
});

test('ось age: корзины из конфига; нет createdAt → ВНЕ КАТЕГОРИЙ', () => {
  const now = new Date('2026-07-24T12:00:00Z');
  const spec = compileAxis(
    {
      categories: [{ name: 'x', patterns: ['^x'] }, { name: 'y', patterns: ['^y'] }],
      axes: {
        age: {
          buckets: [
            { name: '≤7 дн', maxDaysInclusive: 7 },
            { name: '8–30 дн', maxDaysInclusive: 30 },
            { name: '>30 дн' },
          ],
        },
      },
    },
    'age',
  );
  const r = decomposeByAxis(
    [
      { id: 'fresh', createdAt: '2026-07-20' },
      { id: 'mid', createdAt: '2026-07-01' },
      { id: 'old', createdAt: '2026-01-01' },
      { id: 'nodate' },
    ],
    spec,
    { now },
  );
  assert.equal(ageDays({ createdAt: '2026-07-20' }, now), 4);
  assert.deepEqual(
    r.buckets.map((b) => [b.name, b.tasks.map((t) => t.id)]),
    [
      ['≤7 дн', ['fresh']],
      ['8–30 дн', ['mid']],
      ['>30 дн', ['old']],
    ],
  );
  assert.deepEqual(r.unassigned.map((t) => t.id), ['nodate']);
});

test('ось lead / kind: null → ВНЕ КАТЕГОРИЙ', () => {
  const base = {
    categories: [{ name: 'x', patterns: ['^x'] }, { name: 'y', patterns: ['^y'] }],
    axes: {
      lead: { order: ['vesnin', 'dynin'] },
      kind: { order: ['day-sprint', 'epic'] },
    },
  };
  const lead = decomposeByAxis(
    [{ id: 'a', leadPersona: 'dynin' }, { id: 'b', leadPersona: null }, { id: 'c' }],
    compileAxis(base, 'lead'),
  );
  assert.deepEqual(lead.buckets.find((b) => b.name === 'dynin').tasks.map((t) => t.id), ['a']);
  assert.deepEqual(lead.unassigned.map((t) => t.id), ['b', 'c']);

  const kind = decomposeByAxis(
    [{ id: 'a', sprintKind: 'day-sprint' }, { id: 'b' }],
    compileAxis(base, 'kind'),
  );
  assert.equal(kind.buckets[0].tasks.length, 1);
  assert.deepEqual(kind.unassigned.map((t) => t.id), ['b']);
});

test('ось links: наличие полей (не истинность); unmatched → ВНЕ КАТЕГОРИЙ', () => {
  const spec = compileAxis(
    {
      categories: [{ name: 'x', patterns: ['^x'] }, { name: 'y', patterns: ['^y'] }],
      axes: {
        links: {
          groups: [
            { name: 'полный', allOf: ['githubIssue', 'linearId', 'promptPath'] },
            { name: 'без связей', noneOf: ['githubIssue', 'linearId', 'promptPath'] },
          ],
        },
      },
    },
    'links',
  );
  const r = decomposeByAxis(
    [
      { id: 'full', githubIssue: 1, linearId: 'DRU-1', promptPath: 'docs/x.md' },
      { id: 'none' },
      { id: 'only-gh', githubIssue: 2 },
    ],
    spec,
  );
  assert.deepEqual(r.buckets[0].tasks.map((t) => t.id), ['full']);
  assert.deepEqual(r.buckets[1].tasks.map((t) => t.id), ['none']);
  assert.deepEqual(r.unassigned.map((t) => t.id), ['only-gh']);
});

test('ось category через compileAxis/decomposeByAxis совпадает с legacy decompose', () => {
  const config = {
    categories: [
      { name: 'Альфа', patterns: ['^a-'] },
      { name: 'Бета', patterns: ['^b-'] },
    ],
  };
  const tasks = [{ id: 'a-1' }, { id: 'b-2' }, { id: 'zzz' }];
  const legacy = decompose(tasks, compileCategories(config));
  const by = decomposeByAxis(tasks, compileAxis(config, 'category'));
  assert.deepEqual(
    by.buckets.map((b) => b.tasks.map((t) => t.id)),
    legacy.buckets.map((b) => b.tasks.map((t) => t.id)),
  );
  assert.deepEqual(by.unassigned.map((t) => t.id), legacy.unassigned.map((t) => t.id));
});
