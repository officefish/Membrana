/**
 * Зубы инварианта docker-сборок Prisma-пакетов (шот #1724, 05.08).
 * Проверяются чистые функции ядра; ФС не трогается.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { auditPrismaDockerfiles, buildsPackage, generatesPrismaClient } from './lib/prisma-docker-guard.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PKG = { name: '@membrana/background-cabinet', dir: 'packages/background-cabinet', hasPrismaSchema: true };

test('пакет со схемой, чей build зовётся без generate — находка с названной причиной', () => {
  const df = {
    path: 'packages/background-cabinet/Dockerfile',
    content: 'RUN yarn workspaces focus @membrana/background-cabinet --all \\\n  && yarn workspace @membrana/background-cabinet build\n',
  };
  const res = auditPrismaDockerfiles([PKG], [df]);
  assert.equal(res.ok, false);
  assert.equal(res.findings.length, 1);
  assert.match(res.findings[0].reason, /не зовёт prisma generate/u);
  assert.equal(res.blind, 'text-scan', 'слепота названа полем, а не примечанием');
});

test('generate глаголом воркспейса, turbo-фильтром или прямым вызовом — чисто', () => {
  const base = 'RUN yarn workspace @membrana/background-cabinet build\n';
  for (const line of [
    'RUN yarn workspace @membrana/background-cabinet prisma:generate\n',
    'RUN yarn turbo run prisma:generate --filter=@membrana/background-cabinet\n',
    'RUN npx prisma generate\n',
  ]) {
    const res = auditPrismaDockerfiles([PKG], [{ path: 'D', content: line + base }]);
    assert.equal(res.ok, true, `должно быть чисто: ${line.trim()}`);
  }
});

test('пакет БЕЗ схемы не проверяется — инвариант не выдумывает работу', () => {
  const noSchema = { ...PKG, hasPrismaSchema: false };
  const res = auditPrismaDockerfiles([noSchema], [{ path: 'D', content: 'RUN yarn workspace @membrana/background-cabinet build\n' }]);
  assert.equal(res.ok, true);
});

test('Dockerfile, который этот пакет НЕ строит, не судится', () => {
  const res = auditPrismaDockerfiles([PKG], [{ path: 'D', content: 'RUN yarn workspace @membrana/client build\n' }]);
  assert.equal(res.ok, true);
  assert.equal(buildsPackage('RUN yarn workspace @membrana/client build', '@membrana/background-cabinet'), false);
});

test('generate соседнего пакета не засчитывается за наш — фильтр адресный', () => {
  const content = 'RUN yarn workspace @membrana/background-media prisma:generate \\\n  && yarn workspace @membrana/background-cabinet build\n';
  assert.equal(generatesPrismaClient(content, '@membrana/background-cabinet'), false, 'чужой глагол не покрывает наш пакет');
  const res = auditPrismaDockerfiles([PKG], [{ path: 'D', content }]);
  assert.equal(res.ok, false, 'находка остаётся');
});

test('живое дерево: каждый Dockerfile, строящий пакет со схемой, зовёт generate', () => {
  const pkgRoots = ['packages', 'packages/services', 'apps'];
  const packages = [];
  for (const root of pkgRoots) {
    const abs = join(repoRoot, root);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(root, entry.name);
      const pkgJson = join(repoRoot, dir, 'package.json');
      if (!existsSync(pkgJson)) continue;
      let name = null;
      try {
        name = JSON.parse(readFileSync(pkgJson, 'utf8')).name ?? null;
      } catch {
        continue;
      }
      packages.push({ name, dir, hasPrismaSchema: existsSync(join(repoRoot, dir, 'prisma', 'schema.prisma')) });
    }
  }
  const dockerfiles = [];
  for (const pkg of packages) {
    const df = join(repoRoot, pkg.dir, 'Dockerfile');
    if (existsSync(df)) dockerfiles.push({ path: `${pkg.dir}/Dockerfile`, content: readFileSync(df, 'utf8') });
  }
  assert.ok(packages.some((p) => p.hasPrismaSchema), 'снимок пуст — зуб судил бы пустоту');
  assert.ok(dockerfiles.length > 0, 'Dockerfile-ов не найдено — зуб судил бы пустоту');

  const res = auditPrismaDockerfiles(packages, dockerfiles);
  assert.deepEqual(
    res.findings.map((f) => `${f.dockerfile} → ${f.pkg}`),
    [],
    'docker-сборка пакета со схемой обязана звать prisma generate (#1724)',
  );
});
