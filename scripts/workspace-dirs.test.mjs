/**
 * Зубы одного носителя каталогов воркспейсов (ревью #2233).
 *
 * Предмет: сторожа границ обязаны судить ВСЕ пакеты, которые объявил корень, а не те, что
 * кто-то однажды переписал константой. Дрейф уже был живым: корень объявлял
 * `apps/demos/Research-Tree` (@membrana/research-tree-demo), а обе копии списка о нём не
 * знали — пакет существовал, и его никто не проверял.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { workspaceLocations, workspaceSearchPaths } from './lib/workspace-dirs.mjs';

test('глоб даёт родителя, точный путь — сам пакет: формы не смешиваются', () => {
  const out = workspaceLocations({ workspaces: ['packages/*', 'apps/demos/Research-Tree'] });
  assert.deepEqual(out.globs, ['packages']);
  assert.deepEqual(out.exact, ['apps/demos/Research-Tree']);
});

test('форма yarn-объекта читается наравне с массивом', () => {
  const out = workspaceLocations({ workspaces: { packages: ['apps/*'] } });
  assert.deepEqual(out.globs, ['apps']);
});

test('сложные шаблоны молча НЕ приближаются — приблизительный разбор хуже явного пробела', () => {
  const out = workspaceLocations({ workspaces: ['packages/**', 'a/*/b'] });
  assert.deepEqual(out.globs, []);
  assert.deepEqual(out.exact, []);
});

test('пустой и отсутствующий список не роняют разбор', () => {
  assert.deepEqual(workspaceLocations({}), { globs: [], exact: [] });
  assert.deepEqual(workspaceLocations({ workspaces: [] }), { globs: [], exact: [] });
});

test('ЖИВОЙ КОРЕНЬ: точный путь Research-Tree присутствует — он и был слепой зоной', () => {
  const root = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
  const search = workspaceSearchPaths(root);
  assert.ok(
    search.packages.includes('apps/demos/Research-Tree'),
    'корень объявляет этот пакет точным путём; сторожа обязаны его видеть',
  );
});

test('ЖИВОЙ КОРЕНЬ: оба сторожа читают список у корня, а не константой', () => {
  for (const rel of ['./verify-declared-imports.mjs', './verify-image-workspace-deps.mjs']) {
    const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
    assert.match(src, /workspaceSearchPaths\(/u, `${rel}: список обязан читаться у корня`);
    // Константы быть не должно: она и есть тот носитель, который расходится.
    assert.doesNotMatch(src, /const WORKSPACE_DIRS\s*=\s*\[/u, `${rel}: копия списка вернулась`);
  }
});
