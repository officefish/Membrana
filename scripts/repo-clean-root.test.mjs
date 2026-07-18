/**
 * Черновики в корне репозитория — страж называет, но не удаляет.
 *
 * Повод 18.07: в корне лежали пять файлов чужой сессии. Выглядели мусором, а за
 * ними стояли открытая issue и открытый PR. Автоматика снесла бы живую работу —
 * отсюда конструкция «предупреждение, а не блок».
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ROOT_ALLOWED_UNTRACKED, rootScratchFiles } from './lib/repo-clean.mjs';

test('сегодняшний случай: пять файлов чужой сессии названы', () => {
  const found = rootScratchFiles([
    'audit-insight-production.mjs',
    'codex-insight-archive-issue.md',
    'codex-pr-609.md',
    'correct-insight-archive-audit.mjs',
    'investigate-insight-lifecycle.mjs',
  ]);
  assert.equal(found.length, 5);
  assert.deepEqual(
    found.map((f) => f.path),
    [
      'audit-insight-production.mjs',
      'codex-insight-archive-issue.md',
      'codex-pr-609.md',
      'correct-insight-archive-audit.mjs',
      'investigate-insight-lifecycle.mjs',
    ],
  );
});

test('подсказка зависит от рода файла — скрипт и текст лечатся по-разному', () => {
  const [script] = rootScratchFiles(['probe.mjs']);
  const [text] = rootScratchFiles(['draft.md']);
  const [other] = rootScratchFiles(['dump.bin']);
  assert.match(script.hint, /скрипт/);
  assert.match(text.hint, /черновик текста/);
  assert.match(other.hint, /черновик/);
});

test('вложенное — не корень: каталоги живут по своим правилам', () => {
  assert.deepEqual(
    rootScratchFiles(['docs/seanses/протокол.md', 'apps/client/src/tmp.ts', 'data/x.wav']),
    [],
  );
});

test('инструментальные каталоги пропускаются', () => {
  assert.deepEqual(rootScratchFiles(['.yarn/cache/x.zip', 'node_modules/y/z.js', '.turbo/log']), []);
});

test('законное в корне не считается черновиком', () => {
  const allowed = [...ROOT_ALLOWED_UNTRACKED];
  assert.ok(allowed.includes('.env'), '.env лежит в корне законно — там ключи');
  assert.deepEqual(rootScratchFiles(allowed), []);
});

test('пустой ввод и мусорные строки не роняют', () => {
  assert.deepEqual(rootScratchFiles([]), []);
  assert.deepEqual(rootScratchFiles(['', '   ']), []);
});

test('порядок детерминирован — отчёт не должен прыгать между прогонами', () => {
  const a = rootScratchFiles(['b.md', 'a.mjs', 'c.txt']).map((f) => f.path);
  const b = rootScratchFiles(['c.txt', 'a.mjs', 'b.md']).map((f) => f.path);
  assert.deepEqual(a, b);
  assert.deepEqual(a, ['a.mjs', 'b.md', 'c.txt']);
});
