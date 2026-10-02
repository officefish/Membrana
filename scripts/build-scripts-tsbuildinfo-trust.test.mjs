/**
 * Конфиг-зуб спринта stale-dist-turbo-cache-2525 (#2525, блок b1): ни одна сборка пакета не
 * доверяет `.tsbuildinfo` (все `tsc -b` несут `--force`), а сам манифест остаётся выходом
 * задачи build в turbo.json (развилка 2 — умолчание владельца; E7: его удаление петлю не рвёт).
 *
 * На стволе 75668adb зуб красный: 34 сборки пакетов зовут `tsc -b` без `--force`.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  VERDICTS,
  buildScriptTrustsTsbuildinfo,
  judgeScenario,
  trustingBuildScripts,
  turboBuildKeepsManifest,
} from './turbo-stale-dist-scenario.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('buildScriptTrustsTsbuildinfo: tsc -b без --force — доверяет; с --force — нет', () => {
  assert.equal(buildScriptTrustsTsbuildinfo('tsc -b'), true);
  assert.equal(buildScriptTrustsTsbuildinfo('tsc -b && vite build'), true);
  assert.equal(buildScriptTrustsTsbuildinfo('yarn prepare && tsc -b'), true);
  assert.equal(buildScriptTrustsTsbuildinfo('tsc -b --force'), false);
  assert.equal(buildScriptTrustsTsbuildinfo('tsc -b --force && vite build'), false);
  assert.equal(buildScriptTrustsTsbuildinfo('yarn prepare && tsc -b --force'), false);
});

test('buildScriptTrustsTsbuildinfo: не-tsc сборки и мусор — не предмет', () => {
  assert.equal(buildScriptTrustsTsbuildinfo('node scripts/build.mjs'), false);
  assert.equal(buildScriptTrustsTsbuildinfo('tsc --noEmit'), false);
  assert.equal(buildScriptTrustsTsbuildinfo('tsc -p tsconfig.json'), false);
  assert.equal(buildScriptTrustsTsbuildinfo('vite build && tsc -b --force'), false);
  assert.equal(buildScriptTrustsTsbuildinfo(undefined), false);
  assert.equal(buildScriptTrustsTsbuildinfo({ build: 'tsc -b' }), false);
});

test('trustingBuildScripts: возвращает только доверяющие, с путём и скриптом', () => {
  assert.deepEqual(
    trustingBuildScripts([
      { path: 'packages/a/package.json', build: 'tsc -b' },
      { path: 'packages/b/package.json', build: 'tsc -b --force' },
      { path: 'packages/c/package.json', build: undefined },
    ]),
    [{ path: 'packages/a/package.json', build: 'tsc -b' }],
  );
});

test('turboBuildKeepsManifest: .tsbuildinfo среди outputs build', () => {
  assert.equal(turboBuildKeepsManifest({ tasks: { build: { outputs: ['dist/**', '.tsbuildinfo'] } } }), true);
  assert.equal(turboBuildKeepsManifest({ tasks: { build: { outputs: ['dist/**'] } } }), false);
  assert.equal(turboBuildKeepsManifest({}), false);
});

test('judgeScenario: нет эмита на промахе или после replay — ОТРАВЛЕНО; оба есть — ЧИСТО', () => {
  assert.equal(judgeScenario({ afterMiss: false, afterReplay: false }).verdict, VERDICTS.POISONED);
  assert.equal(judgeScenario({ afterMiss: true, afterReplay: false }).verdict, VERDICTS.POISONED);
  assert.equal(judgeScenario({ afterMiss: true, afterReplay: true }).verdict, VERDICTS.CLEAN);
});

// Живой слой: дерево как оно есть. Красный на стволе (34 находки), зелёный на ветке b1.
test('живое дерево: ни одна сборка packages/** не зовёт tsc -b без --force', () => {
  const files = execFileSync('git', ['ls-files', 'packages/*/package.json', 'packages/*/*/package.json', 'packages/*/*/*/package.json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split(/\r?\n/u)
    .filter(Boolean);
  assert.ok(files.length >= 30, `ожидалось ≥30 пакетов, найдено ${files.length}`);
  const packages = files.map((path) => ({
    path,
    build: JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8')).scripts?.build,
  }));
  const findings = trustingBuildScripts(packages);
  assert.deepEqual(findings, [], `сборки, доверяющие .tsbuildinfo:\n${findings.map((f) => `  ${f.path}: ${f.build}`).join('\n')}`);
});

test('живое дерево: turbo.json держит .tsbuildinfo в outputs build (манифест для зуба свежести)', () => {
  const turbo = JSON.parse(readFileSync(join(REPO_ROOT, 'turbo.json'), 'utf8'));
  assert.equal(turboBuildKeepsManifest(turbo), true);
});
