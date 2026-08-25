// Зуб #2147/№1: один сторож покрытия App DI smoke на ВСЕ Nest-приложения.
// Новое приложение с @nestjs/core без смоука или без строк CI-гейта — красный.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { coverageProblems, nestAppsFromManifests } from './lib/nest-di-smoke-coverage.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'unit-tests.yml');

function readManifests() {
  const manifests = [];
  for (const group of ['packages', 'apps']) {
    for (const dir of readdirSync(join(ROOT, group), { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const p = join(ROOT, group, dir.name, 'package.json');
      if (!existsSync(p)) continue;
      manifests.push({ path: `${group}/${dir.name}/package.json`, json: JSON.parse(readFileSync(p, 'utf8')) });
    }
  }
  return manifests;
}

test('#2147/1 все Nest-приложения покрыты App DI smoke и строками CI-гейта', () => {
  const apps = nestAppsFromManifests(readManifests());
  const workflowText = readFileSync(WORKFLOW, 'utf8');
  const problems = coverageProblems({
    apps,
    hasSmokeFile: (dir) => existsSync(join(ROOT, dir, 'src', 'app.module.smoke.test.ts')),
    workflowText,
  });
  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
  // санити: сегодня их ровно три — если стало больше, сторож обязан был их увидеть
  assert.ok(apps.length >= 3, `найдено ${apps.length} Nest-приложений — ожидалось ≥3`);
});

test('#2147/1 порча-фикстура: новое Nest-приложение без смоука/гейта — красный', () => {
  const apps = nestAppsFromManifests([
    { path: 'packages/new-nest-app/package.json', json: { name: '@membrana/new-nest-app', dependencies: { '@nestjs/core': '^11' } } },
    { path: 'packages/plain-lib/package.json', json: { name: '@membrana/plain-lib', dependencies: { zod: '^3' } } },
  ]);
  assert.deepEqual(apps.map((a) => a.name), ['@membrana/new-nest-app']); // не-Nest не судится
  const problems = coverageProblems({ apps, hasSmokeFile: () => false, workflowText: '' });
  assert.equal(problems.length, 3, problems.join('\n'));
  assert.match(problems[0], /app\.module\.smoke\.test\.ts/);
  assert.match(problems[1], /--filter=@membrana\/new-nest-app/);
  assert.match(problems[2], /SMOKE_REQUIRE_DIST=1/);
});

test('#2147/1 пустой скан — сам по себе находка, не тихий зелёный', () => {
  const problems = coverageProblems({ apps: [], hasSmokeFile: () => true, workflowText: '' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /сканер сломан/);
});
