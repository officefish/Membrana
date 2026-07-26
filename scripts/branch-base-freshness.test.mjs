/**
 * #640 — тесты чистого ядра свежести ветки относительно базы (без git).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyBaseFreshness, classifyBaseOwnership } from './lib/branch-base-freshness.mjs';

test('ветка на уровне базы → дифф достоверен', () => {
  const r = classifyBaseFreshness({ behind: 0, phantomDeletions: [] });
  assert.equal(r.state, 'fresh');
  assert.equal(r.trustworthyDiff, true);
});

test('отставание → дифф НЕ достоверен, названо число коммитов (эпизод 17–18.07)', () => {
  const r = classifyBaseFreshness({ behind: 3, phantomDeletions: ['docs/truth/registry.json'] });
  assert.equal(r.state, 'behind');
  assert.equal(r.trustworthyDiff, false);
  assert.match(r.message, /отстала от origin\/main на 3/u);
});

test('ложные «удаления» перечисляются — это они выглядят откатом чужой работы', () => {
  const r = classifyBaseFreshness({
    behind: 2,
    phantomDeletions: ['docs/truth/registry.json', 'scripts/_main-day-issue.mjs'],
  });
  assert.match(r.message, /docs\/truth\/registry\.json/u);
  assert.match(r.message, /scripts\/_main-day-issue\.mjs/u);
});

test('длинный список ложных удалений усекается, число сохраняется', () => {
  const many = Array.from({ length: 12 }, (_, i) => `file-${i}.ts`);
  const r = classifyBaseFreshness({ behind: 1, phantomDeletions: many });
  assert.match(r.message, /\(12\)/u, 'полное число названо');
  assert.match(r.message, /…/u, 'хвост усечён');
});

test('граница: ровно 8 ложных удалений — все названы, многоточия НЕТ (P2 ревью)', () => {
  const eight = Array.from({ length: 8 }, (_, i) => `f${i}.ts`);
  const r = classifyBaseFreshness({ behind: 1, phantomDeletions: eight });
  assert.match(r.message, /\(8\)/u);
  assert.doesNotMatch(r.message, /…/u, 'при ровно 8 усечения быть не должно');
  assert.match(r.message, /f7\.ts/u, 'восьмой элемент назван');
});

test('подсказка чинить названа явно', () => {
  const r = classifyBaseFreshness({ behind: 1, phantomDeletions: [] });
  assert.match(r.message, /git merge origin\/main/u);
});

test('пустой вход безопасен (дефолты)', () => {
  const r = classifyBaseFreshness();
  assert.equal(r.state, 'fresh');
});

// ─── Владение базой ветки (#1272 Ф2) ──────────────────────────────────────────────────
// Эпизод 26.07: ветвление «от текущей точки» (встать на свежую общую ветку не давало
// занятое дерево) утащило в базу чужой невлитый коммит. Заявка предлагала чужой труд под
// моим именем; поймалось только на конфликте слияния. Коммиты были поимённые и честные —
// ложь возникла на уровне БАЗЫ, чего не видел ни один зуб.

test('база чиста: только свои коммиты поверх общей ветки', () => {
  const r = classifyBaseOwnership({ own: ['aaa1111', 'bbb2222'], foreign: [] });
  assert.equal(r.state, 'clean');
  assert.match(r.message, /2 свой/);
});

test('пустая база — тоже чистая, а не подозрительная', () => {
  const r = classifyBaseOwnership({ own: [], foreign: [] });
  assert.equal(r.state, 'clean');
  assert.match(r.message, /своих коммитов поверх origin\/main пока нет/);
});

test('чужой коммит в базе называется автором и темой, а не просто числом', () => {
  const r = classifyBaseOwnership({
    own: ['aaa1111'],
    foreign: [{ sha: 'bce70731', author: 'Cursor', subject: 'feat(strategic-docs): add workshop publish CLI' }],
  });
  assert.equal(r.state, 'foreign-base');
  assert.match(r.message, /bce70731/, 'коммит назван');
  assert.match(r.message, /Cursor/, 'автор назван — иначе непонятно, чей труд');
  assert.match(r.message, /чужой труд под вашим именем/i);
  assert.match(r.message, /собрать ветку начисто/, 'назван выход, а не только диагноз');
});

test('много чужих коммитов: список усечён, но количество честное', () => {
  const foreign = Array.from({ length: 7 }, (_, i) => ({ sha: `sha${i}`, author: 'Сосед', subject: `работа ${i}` }));
  const r = classifyBaseOwnership({ own: [], foreign });
  assert.equal(r.state, 'foreign-base');
  assert.match(r.message, /7 ЧУЖОЙ/, 'число не усечено');
  assert.ok(r.message.includes('…'), 'перечень усечён явно, а не молча');
});
