/**
 * Тест шаблона карточки дерева (docs/repo/WORKTREE_TEMPLATE.md, 17.09).
 *
 * Шаблон обещает, что его поля сходятся с тем, что читает classifyWorktree.
 * Обещание без прибора — слова; здесь шаблон прогоняется через ТОТ ЖЕ парсер,
 * что и repo:clean:
 *   - незаполненная копия шаблона дерево НЕ регистрирует (kind не распознан → null);
 *   - заполненная kind=sprint читается как sprint и классифицируется по PR;
 *   - заполненная kind=canon читается как canon (сносу не подлежит);
 *   - все машинные ключи парсера присутствуют в шаблоне.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { classifyWorktree, parseWorktreeCard } from './lib/classify-worktree.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = resolve(repoRoot, 'docs/repo/WORKTREE_TEMPLATE.md');

/** Блок для копирования — первый fenced-блок ```markdown в шаблоне. */
function templateCard() {
  const doc = readFileSync(templatePath, 'utf8');
  const m = doc.match(/```markdown\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(m, 'в шаблоне должен быть fenced-блок ```markdown с карточкой');
  return m[1];
}

function rows(card) {
  return card.split(/\r?\n/);
}

function isRow(line, field) {
  const cells = line.split('|').map((c) => c.trim());
  return cells.length > 2 && cells[1] === field;
}

/** Подставить значение в строку таблицы `| field | … |`. */
function fill(card, field, value) {
  const lines = rows(card);
  const i = lines.findIndex((l) => isRow(l, field));
  assert.notEqual(i, -1, `поле ${field} должно быть строкой таблицы шаблона`);
  lines[i] = `| ${field} | ${value} |`;
  return lines.join('\n');
}

/** Для sprint строка canonName удаляется — так велит шаблон. */
function dropRow(card, field) {
  return rows(card).filter((l) => !isRow(l, field)).join('\n');
}

test('незаполненная копия шаблона дерево не регистрирует', () => {
  assert.equal(parseWorktreeCard(templateCard()), null);
});

test('шаблон содержит все машинные ключи парсера', () => {
  const card = templateCard();
  for (const key of ['kind', 'canonName', 'Базовая ветка', 'Владелец']) {
    assert.ok(rows(card).some((l) => isRow(l, key)), `нет строки ${key}`);
  }
});

test('заполненный kind=sprint читается как sprint и судится по PR', () => {
  const text = dropRow(fill(fill(templateCard(), 'kind', 'sprint'), 'Владелец', 'сессия В (17.09)'), 'canonName');
  const card = parseWorktreeCard(text);
  assert.deepEqual(card, { kind: 'sprint', base: 'main', owner: 'сессия В (17.09)' });
  const w = { path: 'C:/w/Membrana-x', branch: 'feat/x', card, dirtyCount: 0, unpushedCount: 0 };
  assert.equal(classifyWorktree({ ...w, pr: { number: 1, state: 'MERGED' } }).class, 'sprint-closed');
  assert.equal(classifyWorktree({ ...w, pr: { number: 1, state: 'OPEN' } }).class, 'sprint-open');
  assert.equal(classifyWorktree({ ...w, pr: null }).class, 'sprint-open');
  assert.equal(classifyWorktree({ ...w, branch: null, pr: null }).class, 'unknown');
});

test('заполненный kind=canon читается как canon и не сносится', () => {
  const card = parseWorktreeCard(fill(fill(templateCard(), 'kind', 'canon'), 'canonName', 'tooling'));
  assert.ok(card, 'карточка canon должна разбираться');
  assert.equal(card.kind, 'canon');
  assert.equal(card.canonName, 'tooling');
  const c = classifyWorktree({
    path: 'x',
    branch: 'b',
    card,
    dirtyCount: 0,
    unpushedCount: 0,
    pr: { number: 1, state: 'MERGED' },
  });
  assert.equal(c.class, 'canon');
});

test('нераспознанный kind (long-lived) = отсутствие карточки → unregistered', () => {
  const card = parseWorktreeCard(fill(templateCard(), 'kind', '**long-lived** (не sprint)'));
  assert.equal(card, null);
  const c = classifyWorktree({ path: 'x', branch: 'b', card, dirtyCount: 0, unpushedCount: 0, pr: null });
  assert.equal(c.class, 'unregistered');
});
