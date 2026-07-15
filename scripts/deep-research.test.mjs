/**
 * Тесты deep-research (#516).
 *
 * Главное — гарды: обрезанный или незаполненный вопрос обязан валить прогон ДО
 * траты рана. Perplexity ответит на что угодно, и сбой будет тихим (#402).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  hasFilledResearchQuestions,
  researchPath,
  researchSectionStub,
  runDeepResearch,
} from './lib/deep-research.mjs';
import { parseResearchCli } from './research.mjs';

const withQuestions = (...qs) =>
  ['# Промпт: тест', '', '## Вопросы для research (Q1–Q3)', '', ...qs.map((q, i) => `${i + 1}. ${q}`)].join('\n');

// ─── заготовка секции ─────────────────────────────────────────────────────────────

test('researchSectionStub даёт три плейсхолдера и ссылку на команду', () => {
  const stub = researchSectionStub({ id: 'my-sprint' });
  assert.match(stub, /## Вопросы для research/u);
  assert.match(stub, /yarn research my-sprint/u);
  for (const label of ['Landscape', 'Fit \\(Membrana\\)', 'Risk']) {
    assert.match(stub, new RegExp(`\\*\\*${label}:\\*\\*`, 'u'));
  }
});

test('заготовка НЕ считается заполненной — иначе ран уйдёт на плейсхолдеры', () => {
  const md = '# Промпт\n' + researchSectionStub({ id: 'x' });
  assert.equal(hasFilledResearchQuestions(md), false);
});

test('заполненные вопросы распознаются', () => {
  const md = withQuestions(
    '**Landscape:** какие практики сложились в 2025-2026 для внесения внешнего ресёрча в цикл разработки?',
    '**Fit (Membrana):** по каким признакам решают, что внешний ресёрч нужен маленькой команде с агентами?',
    '**Risk:** чем рискует команда, принимая выжимку поисковой LLM как вход для архитектурного решения?',
  );
  assert.equal(hasFilledResearchQuestions(md), true);
});

// ─── гарды: ран не тратится ───────────────────────────────────────────────────────

test('нет секции вопросов → ошибка, а не молчаливый прогон', async () => {
  await assert.rejects(
    () => runDeepResearch({ sourceMd: '# Промпт без вопросов', apiKey: 'k' }),
    /Секция «Вопросы для research» не найдена/u,
  );
});

test('плейсхолдеры не заполнены → ран не тратим', async () => {
  const md = '# Промпт\n' + researchSectionStub({ id: 'x' });
  await assert.rejects(() => runDeepResearch({ sourceMd: md, apiKey: 'k' }), /плейсхолдеры/u);
});

test('оборванный вопрос → ран не тратим (живой случай #402)', async () => {
  const md = withQuestions(
    '**Landscape:** какие практики сложились для (Linear/Jira/GitHub Projects,',
    '**Fit (Membrana):** по каким признакам решают, что внешний ресёрч нужен маленькой команде?',
    '**Risk:** чем рискует команда, принимая выжимку поисковой LLM как вход для решения?',
  );
  await assert.rejects(() => runDeepResearch({ sourceMd: md, apiKey: 'k' }), /оборванными/u);
});

test('dry-run возвращает запросы и НЕ ходит в сеть (apiKey игнорируется)', async () => {
  const md = withQuestions(
    '**Landscape:** какие практики сложились в 2025-2026 для внесения внешнего ресёрча в цикл разработки?',
    '**Fit (Membrana):** по каким признакам решают, что внешний ресёрч нужен маленькой команде с агентами?',
    '**Risk:** чем рискует команда, принимая выжимку поисковой LLM как вход для архитектурного решения?',
  );
  const res = await runDeepResearch({ sourceMd: md, apiKey: 'k', dryRun: true });
  assert.equal(res.mode, 'dry-run');
  assert.equal(res.queries.length, 3);
  assert.equal(res.markdown, undefined);
});

test('без ключа → manual-режим с запросами, а не падение', async () => {
  const md = withQuestions(
    '**Landscape:** какие практики сложились в 2025-2026 для внесения внешнего ресёрча в цикл разработки?',
    '**Fit (Membrana):** по каким признакам решают, что внешний ресёрч нужен маленькой команде с агентами?',
    '**Risk:** чем рискует команда, принимая выжимку поисковой LLM как вход для архитектурного решения?',
  );
  const res = await runDeepResearch({ sourceMd: md });
  assert.equal(res.mode, 'manual');
  assert.equal(res.queries.length, 3);
});

// ─── пути и CLI ───────────────────────────────────────────────────────────────────

test('researchPath кладёт выжимку рядом с задачами по id', () => {
  assert.match(researchPath('/repo', 'my-sprint').split('\\').join('/'), /docs\/tasks\/research\/my-sprint\.md$/u);
});

test('CLI: id и --dry-run', () => {
  assert.deepEqual(parseResearchCli(['my-sprint']), { id: 'my-sprint', dryRun: false, help: false });
  assert.equal(parseResearchCli(['my-sprint', '--dry-run']).dryRun, true);
  assert.equal(parseResearchCli(['--help']).help, true);
  assert.equal(parseResearchCli([]).id, undefined);
});
