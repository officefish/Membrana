/**
 * #640 — тесты чистого ядра свежести ветки относительно базы (без git).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyBaseFreshness } from './lib/branch-base-freshness.mjs';

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

test('подсказка чинить названа явно', () => {
  const r = classifyBaseFreshness({ behind: 1, phantomDeletions: [] });
  assert.match(r.message, /git merge origin\/main/u);
});

test('пустой вход безопасен (дефолты)', () => {
  const r = classifyBaseFreshness();
  assert.equal(r.state, 'fresh');
});
