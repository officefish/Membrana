/**
 * Тесты зуба порядка сборки (#2436).
 *
 * Зуб судит две вещи, и обе проверяются здесь на подменных входах — без чтения репозитория,
 * чтобы падение говорило о правиле, а не о состоянии дерева. Живой прогон по дереву —
 * отдельной строкой в конце: он и есть предмет, и он обязан быть зелёным.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildOrderGaps,
  declaredDependencies,
  pathsWorkspaces,
  referencePaths,
  undeclaredBuildOrder,
} from './lib/build-order-deps.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TURBO_JSON = resolve(ROOT, 'turbo.json');
const TOOL = resolve(ROOT, 'scripts/verify-build-order-deps.mjs');

test('предмет зуба: turbo.json на месте и разбирается', () => {
  assert.ok(existsSync(TURBO_JSON), `предмет зуба потерян: нет ${TURBO_JSON}`);
  const turbo = JSON.parse(readFileSync(TURBO_JSON, 'utf8'));
  assert.ok(turbo.tasks, 'в turbo.json нет раздела tasks — судить нечего');
});

test('buildOrderGaps: пропавшая задача названа отдельно от задачи без ^build', () => {
  const gaps = buildOrderGaps(
    { tasks: { build: { dependsOn: ['^build'] }, typecheck: { dependsOn: [] } } },
    ['build', 'typecheck', 'test'],
  );
  assert.deepEqual(gaps.missingTask, ['test']);
  assert.deepEqual(gaps.missingDependsOn, ['typecheck']);
});

test('buildOrderGaps: задача без dependsOn вовсе — тоже находка, а не «ну и ладно»', () => {
  const gaps = buildOrderGaps({ tasks: { typecheck: {} } }, ['typecheck']);
  assert.deepEqual(gaps.missingTask, []);
  assert.deepEqual(gaps.missingDependsOn, ['typecheck']);
});

test('pathsWorkspaces берёт имена из paths, включая форму со звёздочкой', () => {
  const text = `{"compilerOptions":{"paths":{
    "@membrana/core": ["x"], "@membrana/core/*": ["y"], "@/*": ["z"]
  }}}`;
  assert.deepEqual([...pathsWorkspaces(text)], ['@membrana/core']);
});

test('referencePaths берёт относительные цели references', () => {
  const text = `{"references":[{"path":"../core"},{"path":"../services/trends-detector"}]}`;
  assert.deepEqual(referencePaths(text), ['../core', '../services/trends-detector']);
});

test('declaredDependencies считает все три поля', () => {
  const declared = declaredDependencies({
    dependencies: { '@membrana/a': '*', react: '^18' },
    devDependencies: { '@membrana/b': '*' },
    peerDependencies: { '@membrana/c': '*' },
  });
  assert.deepEqual([...declared].sort(), ['@membrana/a', '@membrana/b', '@membrana/c']);
});

test('undeclaredBuildOrder: находка — только свой пакет, только необъявленный', () => {
  const known = new Set(['@membrana/me', '@membrana/near', '@membrana/far']);
  const named = new Set(['@membrana/me', '@membrana/near', '@membrana/far', '@membrana/чужой']);
  const declared = new Set(['@membrana/far']);
  assert.deepEqual(undeclaredBuildOrder('@membrana/me', named, declared, known), ['@membrana/near']);
});

test('undeclaredBuildOrder: объявленное, но не названное в tsconfig — не находка', () => {
  const known = new Set(['@membrana/me', '@membrana/extra']);
  const out = undeclaredBuildOrder('@membrana/me', new Set(), new Set(['@membrana/extra']), known);
  assert.deepEqual(out, []);
});

test('живой прогон по дереву зелёный: порядок сборки объявлен и в tsconfig, и в манифесте', () => {
  // Инструмент выходит с 1 на находках, и `execFileSync` тогда бросает «Command failed» —
  // отказ без предмета. Отчёт нужен и при красном, поэтому код возврата ловится, а судит
  // содержимое: падение обязано НАЗВАТЬ пакет и соседа, а не номер выхода.
  let out;
  try {
    out = execFileSync(process.execPath, [TOOL, '--json'], { encoding: 'utf8' });
  } catch (e) {
    out = String(e.stdout ?? '');
    assert.ok(out.trim(), `зуб упал без отчёта: ${e.stderr ?? e.message}`);
  }
  const report = JSON.parse(out);
  assert.deepEqual(report.gaps.missingTask, [], 'в turbo.json пропала задача, за которой следит зуб');
  assert.deepEqual(report.gaps.missingDependsOn, [], 'задача turbo перестала ждать ^build');
  assert.deepEqual(
    report.findings,
    [],
    'сосед назван порядком сборки в tsconfig, но не объявлен в package.json — turbo его не увидит',
  );
  assert.equal(report.ok, true);
});
