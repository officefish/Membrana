/**
 * Зуб диагноста воркспейс-ссылок (#1465 Ф1).
 *
 * ВЕЩДОК 29.07: `@membrana/rag-service` вёл в ГЛАВНОЕ дерево, где пакет не собран.
 * `TS2307` показывал на потребителя, `turbo` отдавал `cache hit` и собирал свою копию —
 * диагноз занял несколько заходов и проверку базовой линии через stash.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LINK_STATES, classifyLink, declaredEntries, summarize } from './lib/workspace-links.mjs';

const base = { name: 'x', target: '/t/x', outside: false, manifest: { types: './dist/index.d.ts' }, missing: [] };

test('ВЕЩДОК: цель в другом дереве без dist — причина названа, не «модуль не найден»', () => {
  const r = classifyLink({
    ...base,
    name: 'rag-service',
    target: 'C:\\Users\\u\\practice\\Membrana\\packages\\services\\rag',
    outside: true,
    missing: ['./dist/index.d.ts'],
  });
  assert.equal(r.state, 'unbuilt');
  assert.match(r.reason, /в ДРУГОМ дереве/u);
  assert.match(r.reason, /не собран/u);
});

test('совет при цели снаружи предупреждает про turbo — он соберёт НЕ ту копию', () => {
  const r = summarize([
    classifyLink({ ...base, outside: true, missing: ['./dist/index.d.ts'] }),
  ]);
  assert.equal(r.state, 'broken');
  assert.match(r.advice, /turbo соберёт СВОЮ копию/u);
});

test('та же поломка внутри своего дерева советует собрать здесь', () => {
  const r = summarize([classifyLink({ ...base, outside: false, missing: ['./dist/index.d.ts'] })]);
  assert.match(r.advice, /собрать пакет в этом дереве/u);
  assert.doesNotMatch(r.advice, /turbo/u);
});

test('целая ссылка — ok и не попадает в находки', () => {
  const r = classifyLink(base);
  assert.equal(r.state, 'ok');
  assert.deepEqual(summarize([r]).findings, []);
});

test('висячая ссылка отделена от несобранного пакета — лечится по-разному', () => {
  const r = classifyLink({ ...base, target: null });
  assert.equal(r.state, 'dangling');
});

test('нечитаемый package.json — не «всё хорошо» и не «не собран»', () => {
  const r = classifyLink({ ...base, manifest: null });
  assert.equal(r.state, 'no_manifest');
  assert.equal(summarize([r]).state, 'clean', 'манифест не красное: резолв им ещё не ломается');
});

test('пакет без объявленного входа не выдумывает поломку', () => {
  const r = classifyLink({ ...base, manifest: {}, missing: [] });
  assert.equal(r.state, 'ok');
});

test('несобранное приложение не находка: dist/main.js — артефакт запуска, не резолва', () => {
  // Первый прогон 29.07 дал 7 находок вместо 3: четыре private-приложения
  // (background-office, -media, -cabinet, membrana-studio) шумели непостроенным main.
  const entries = declaredEntries({ private: true, main: './dist/main.js' });
  assert.deepEqual(entries, []);
});

test('импортируемый пакет без types проверяется по main', () => {
  assert.deepEqual(declaredEntries({ main: './dist/index.js' }), ['./dist/index.js']);
});

test('библиотека проверяется и по types, и по main', () => {
  const entries = declaredEntries({ types: './dist/index.d.ts', main: './dist/index.js' });
  assert.deepEqual(entries, ['./dist/index.d.ts', './dist/index.js']);
});

test('typings как синоним types', () => {
  assert.deepEqual(declaredEntries({ typings: './t.d.ts' }), ['./t.d.ts']);
});

test('пакет только с exports не слепая зона', () => {
  const entries = declaredEntries({
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
  });
  assert.deepEqual(entries, ['./dist/index.d.ts', './dist/index.js']);
});

test('exports строкой тоже читается', () => {
  assert.deepEqual(declaredEntries({ exports: { '.': './dist/index.js' } }), ['./dist/index.js']);
});

test('exports не задваивает уже объявленный вход', () => {
  const entries = declaredEntries({
    types: './dist/index.d.ts',
    exports: { '.': { types: './dist/index.d.ts' } },
  });
  assert.deepEqual(entries, ['./dist/index.d.ts']);
});

test('словарь исходов закрыт', () => {
  const seen = [
    classifyLink(base),
    classifyLink({ ...base, target: null }),
    classifyLink({ ...base, manifest: null }),
    classifyLink({ ...base, missing: ['./dist/index.d.ts'] }),
  ].map((r) => r.state);
  for (const s of seen) assert.ok(LINK_STATES.includes(s), `${s} вне словаря`);
});

test('чистый прогон говорит, где НЕ искать причину', () => {
  const r = summarize([classifyLink(base)]);
  assert.equal(r.state, 'clean');
  assert.match(r.advice, /ищи не здесь/u);
});
