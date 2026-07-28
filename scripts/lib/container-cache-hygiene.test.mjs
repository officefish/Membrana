/**
 * Зуб гигиены кешей контейнеров: живой репозиторий не трекает ни одного <контейнер>/cache.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { cacheDirsOf, cacheHygieneProblems } from './container-cache-hygiene.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function liveCacheDirs() {
  const docs = join(repoRoot, 'docs');
  const out = [];
  for (const name of readdirSync(docs, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const dir = `docs/${name.name}/cache`;
    if (existsSync(join(repoRoot, dir))) out.push(dir);
  }
  return cacheDirsOf(out);
}

function isIgnored(dir) {
  try {
    execFileSync('git', ['check-ignore', '-q', `${dir}/probe`], { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test('ЖИВОЙ репозиторий: каждый кеш-каталог контейнера игнорируется git', () => {
  const dirs = liveCacheDirs();
  const checked = dirs.map((dir) => ({ dir, ignored: isIgnored(dir) }));
  assert.deepEqual(cacheHygieneProblems(checked), []);
});

test('находка называет каталог и лечение (не молчаливый пропуск)', () => {
  const p = cacheHygieneProblems([{ dir: 'docs/archivarius/cache', ignored: false }]);
  assert.equal(p.length, 1);
  assert.match(p[0], /docs\/archivarius\/cache/u);
  assert.match(p[0], /\.gitignore/u);
  assert.deepEqual(cacheHygieneProblems([{ dir: 'docs/x/cache', ignored: true }]), []);
});

test('правило берёт только каталоги cache, не файлы с cache в имени', () => {
  assert.deepEqual(cacheDirsOf(['docs/a/cache', 'docs/b/cache-notes.md', 'docs/c/subcache']), ['docs/a/cache']);
});
