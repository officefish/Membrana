/**
 * Зуб словаря типов коммита (#1449 хвост, 29.07).
 *
 * Хук `.githooks/commit-msg` — POSIX sh и импортировать модуль не может, поэтому список
 * живёт в нём регуляркой. Единственная защита от расхождения — этот зуб: разошлись
 * хук и `COMMIT_TYPES` → красное, а не сюрприз на живом шипе.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { COMMIT_TYPES, explainCommitType, readBranchKinds } from './lib/commit-types.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Типы из grep-регулярки хука: ^(feat|fix|…)(\([^)]+\))?!?: .+ */
function typesFromHook() {
  const src = readFileSync(join(root, '.githooks', 'commit-msg'), 'utf8');
  const m = /\^\(([a-z|]+)\)\\\(/u.exec(src) ?? /\^\(([a-z|]+)\)/u.exec(src);
  assert.ok(m, 'в commit-msg не нашлась регулярка conventional-заголовка');
  return m[1].split('|');
}

test('хук и COMMIT_TYPES несут ОДИН словарь', () => {
  assert.deepEqual([...typesFromHook()].sort(), [...COMMIT_TYPES].sort());
});

test('ВЕЩДОК 29.07: --type tooling объяснён через kind ветки, а не только «неверно»', () => {
  const msg = explainCommitType('tooling', ['tooling', 'feat', 'fix']);
  assert.ok(msg, 'tooling не должен проходить как тип коммита');
  assert.match(msg, /kind ВЕТКИ/u);
  assert.match(msg, /chore/u);
});

test('kind ветки, которого нет в словаре коммитов, тоже получает подсказку', () => {
  for (const kind of ['meeting', 'storm', 'night', 'truth', 'research', 'sprint']) {
    const msg = explainCommitType(kind, readBranchKinds(root));
    assert.ok(msg, `${kind} не должен быть типом коммита`);
    assert.match(msg, /kind ВЕТКИ/u);
  }
});

test('валидный тип — молчание (null), а не пустая строка', () => {
  for (const t of COMMIT_TYPES) assert.equal(explainCommitType(t), null);
});

test('мусорный тип отвергается и без словаря kind-ов', () => {
  const msg = explainCommitType('нечто', []);
  assert.ok(msg);
  assert.doesNotMatch(msg, /kind ВЕТКИ/u);
  assert.match(msg, /типы: feat\|fix/u);
});

test('словарь kind-ов ветки читается из layer-rules.json', () => {
  const kinds = readBranchKinds(root);
  assert.ok(kinds.includes('tooling'), 'tooling обязан быть валидным kind ветки');
  assert.ok(kinds.includes('feat'));
});
