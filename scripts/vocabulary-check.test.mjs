import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  check,
  checkGenus,
  renderVocabularyMd,
  vocabularySchemaProblems,
} from './lib/vocabulary-check.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = JSON.parse(readFileSync(resolve(repoRoot, 'docs/procedures/vocabulary.json'), 'utf8'));

test('боевой источник словаря валиден: 4 статьи ядра, роды объявлены', () => {
  assert.deepEqual(vocabularySchemaProblems(LIVE), []);
  assert.equal(LIVE.categories.length, 4);
});

test('check: слово в прозе БЕЗ маркера — не срабатывает (нет ложных тревог)', () => {
  const { violations } = check('Задача этого текста — рассказать про задачи.', LIVE);
  assert.deepEqual(violations, []);
});

test('check: маркер без статьи — нарушение с адресом и причиной', () => {
  const { violations } = check('строка раз\nисполняет @cat:миссия сегодня', LIVE);
  assert.equal(violations.length, 1);
  assert.deepEqual(
    { term: violations[0].term, location: violations[0].location },
    { term: 'миссия', location: 'строка 2' },
  );
});

test('check: объявленный маркер — явный пустой список нарушений (анти-Молчун)', () => {
  const r = check('процедура работает с @cat:задача', LIVE);
  assert.ok(Array.isArray(r.violations) && r.violations.length === 0);
});

test('checkGenus: мутация ориентира — нарушение; чтение — валидно', () => {
  const bad = checkGenus('шаг @op:archive:@cat:стратегическая-цель', LIVE);
  assert.equal(bad.violations.length, 1);
  assert.match(bad.violations[0].reason, /запрещён роду «ориентир»/u);

  const ok = checkGenus('шаг @op:read:@cat:стратегическая-цель и @op:create:@cat:задача', LIVE);
  assert.deepEqual(ok.violations, []);
  assert.equal(ok.valid.length, 2);
});

test('checkGenus: отношение — link/unlink можно, мутация концов не выражается effect-ом', () => {
  const r = checkGenus('@op:link:@cat:ответственность и @op:own:@cat:ответственность', LIVE);
  assert.equal(r.valid.length, 1);
  assert.equal(r.violations.length, 1);
});

test('checkGenus: честный хвост аудитора присутствует в каждом отчёте', () => {
  assert.match(checkGenus('', LIVE).auditorTail, /аудитор/u);
});

test('проекция VOCABULARY.md несёт пометку generated и все статьи', () => {
  const md = renderVocabularyMd(LIVE);
  assert.match(md, /generated/u);
  for (const c of LIVE.categories) assert.ok(md.includes(c.marker));
});
