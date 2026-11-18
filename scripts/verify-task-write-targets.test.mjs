/**
 * Тесты зуба «у задач одного пакета не пересекаются файлы записи» (#2660).
 *
 * Правило проверяется на подменных входах — без чтения репозитория, чтобы падение говорило
 * о правиле, а не о состоянии дерева. Живой прогон по дереву — последним тестом.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyKnownDebt,
  globToRegExp,
  packageWriteConflicts,
  parseJsonc,
  parseTscInvocations,
  scriptWriteTargets,
  waitsFor,
} from './lib/task-write-targets.mjs';
import { KNOWN_DEBT } from './verify-task-write-targets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = resolve(ROOT, 'scripts/verify-task-write-targets.mjs');

const TURBO = {
  build: { dependsOn: ['^build'], outputs: ['dist/**', '.tsbuildinfo'] },
  typecheck: { dependsOn: ['^build'], outputs: ['.tsbuildinfo.typecheck'] },
  dev: { cache: false, persistent: true },
};

/** Пакет как в стволе до #2660: composite, buildinfo `./.tsbuildinfo`. */
function reader(files) {
  return (p) => files[p] ?? null;
}
const PKG_TSCONFIG = {
  'tsconfig.json': {
    extends: './tsconfig.base.json',
    compilerOptions: { composite: true, outDir: './dist', tsBuildInfoFile: './.tsbuildinfo' },
  },
  'tsconfig.base.json': { compilerOptions: { incremental: true } },
};

test('parseJsonc: комментарии и висячие запятые, строки с // не ломаются', () => {
  const obj = parseJsonc('{ // c\n "a": "http://x", /* b */ "b": [1,2,], }');
  assert.deepEqual(obj, { a: 'http://x', b: [1, 2] });
});

test('parseTscInvocations: -b, -p, --noEmit, --tsBuildInfoFile; чужие команды пропущены', () => {
  const inv = parseTscInvocations(
    'yarn prepare && tsc -b && vite build; tsc --noEmit -p tsconfig.test.json --tsBuildInfoFile ./x',
  );
  assert.equal(inv.length, 2);
  assert.deepEqual(inv[0], { build: true, projects: ['.'], noEmit: false, tsBuildInfoFile: null });
  assert.deepEqual(inv[1], {
    build: false,
    projects: ['tsconfig.test.json'],
    noEmit: true,
    tsBuildInfoFile: './x',
  });
});

test('scriptWriteTargets: --noEmit не выпускает outDir, но buildinfo пишет (composite)', () => {
  const t = scriptWriteTargets('tsc --noEmit', reader(PKG_TSCONFIG));
  assert.deepEqual(
    t.map((x) => `${x.kind}:${x.path}`),
    ['buildinfo:.tsbuildinfo'],
  );
});

test('scriptWriteTargets: CLI --tsBuildInfoFile сильнее tsconfig', () => {
  const t = scriptWriteTargets('tsc --noEmit --tsBuildInfoFile ./.tsbuildinfo.typecheck', reader(PKG_TSCONFIG));
  assert.deepEqual(t.map((x) => x.path), ['.tsbuildinfo.typecheck']);
});

test('scriptWriteTargets: без tsBuildInfoFile — имя по правилу TypeScript', () => {
  const files = { 'tsconfig.node.json': { compilerOptions: { composite: true, noEmit: true } } };
  const t = scriptWriteTargets('tsc -p tsconfig.node.json', reader(files));
  assert.deepEqual(t.map((x) => x.path), ['tsconfig.node.tsbuildinfo']);
});

test('scriptWriteTargets: incremental=false — buildinfo нет', () => {
  const files = { 'tsconfig.json': { compilerOptions: { incremental: false, noEmit: true } } };
  assert.deepEqual(scriptWriteTargets('tsc --noEmit', reader(files)), []);
});

test('scriptWriteTargets: tsc -b идёт по ссылкам внутри пакета, но не в соседей', () => {
  const files = {
    'tsconfig.json': { files: [], references: [{ path: './tsconfig.app.json' }, { path: '../../packages/core' }] },
    'tsconfig.app.json': { compilerOptions: { composite: true, noEmit: true, tsBuildInfoFile: './.tsbuildinfo.app' } },
  };
  const t = scriptWriteTargets('tsc -b', reader(files));
  assert.deepEqual(t.map((x) => x.path), ['.tsbuildinfo.app']);
});

test('waitsFor: dependsOn без «^» связывает задачи пакета, «^build» — нет', () => {
  const tasks = { typecheck: { dependsOn: ['^build', 'build'] }, build: { dependsOn: ['^build'] } };
  assert.equal(waitsFor(tasks, 'typecheck', 'build'), true);
  assert.equal(waitsFor(TURBO, 'typecheck', 'build'), false);
});

test('globToRegExp: «dist/**» накрывает вложенное, «.tsbuildinfo» — только свой файл', () => {
  assert.ok(globToRegExp('dist/**').test('dist/a/b.d.ts'));
  assert.ok(globToRegExp('.tsbuildinfo').test('.tsbuildinfo'));
  assert.ok(!globToRegExp('.tsbuildinfo').test('.tsbuildinfo.typecheck'));
});

test('красный вход #2660: typecheck и build пишут один .tsbuildinfo — находка с предметом', () => {
  const pkg = { scripts: { build: 'tsc -b', typecheck: 'tsc --noEmit', dev: 'tsc -b --watch' } };
  const found = packageWriteConflicts(pkg, TURBO, reader(PKG_TSCONFIG));
  assert.ok(
    found.some((f) => f.kind === 'overlap' && f.a === 'build' && f.b === 'typecheck' && f.path === '.tsbuildinfo'),
    JSON.stringify(found),
  );
  assert.ok(!found.some((f) => f.a === 'dev' || f.b === 'dev'), 'persistent dev не судится');
});

test('красный вход: outputs typecheck накрывают buildinfo сборки (кэш перетрёт)', () => {
  const pkg = { scripts: { build: 'tsc -b', typecheck: 'tsc --noEmit --tsBuildInfoFile ./.tsbuildinfo.typecheck' } };
  const turbo = { ...TURBO, typecheck: { dependsOn: ['^build'], outputs: ['.tsbuildinfo'] } };
  const found = packageWriteConflicts(pkg, turbo, reader(PKG_TSCONFIG));
  assert.deepEqual(
    found.map((f) => `${f.kind}:${f.a}->${f.b}:${f.path}`),
    ['outputs:typecheck->build:.tsbuildinfo'],
  );
});

test('зелёный вход: свой buildinfo у typecheck и свои outputs — находок нет', () => {
  const pkg = { scripts: { build: 'tsc -b', typecheck: 'tsc --noEmit --tsBuildInfoFile ./.tsbuildinfo.typecheck' } };
  assert.deepEqual(packageWriteConflicts(pkg, TURBO, reader(PKG_TSCONFIG)), []);
});

test('зелёный вход: typecheck ждёт build своего пакета — пересечение не гонка', () => {
  const pkg = { scripts: { build: 'tsc -b', typecheck: 'tsc --noEmit' } };
  const turbo = { build: TURBO.build, typecheck: { dependsOn: ['^build', 'build'], outputs: [] } };
  assert.deepEqual(packageWriteConflicts(pkg, turbo, reader(PKG_TSCONFIG)), []);
});

const F = (dir, a = 'build', b = 'typecheck') => ({ dir, kind: 'overlap', a, b, path: '.tsbuildinfo.app' });
const DEBT = [{ dir: 'apps/cabinet', tasks: ['build', 'typecheck'], reason: 'r', issue: '#2660' }];

test('известный долг: находка пакета из списка исключена и видна как долг', () => {
  const r = applyKnownDebt([F('apps/cabinet')], DEBT);
  assert.deepEqual(r.active, []);
  assert.equal(r.exempted.length, 1);
  assert.equal(r.exempted[0].issue, '#2660');
  assert.deepEqual(r.stale, []);
});

test('известный долг не накрывает другие пакеты и другие пары задач', () => {
  const r = applyKnownDebt(
    [F('apps/cabinet', 'build', 'test'), F('apps/cabinet-other'), F('packages/core')],
    DEBT,
  );
  assert.deepEqual(
    r.active.map((f) => `${f.dir}:${f.a}/${f.b}`),
    ['apps/cabinet:build/test', 'apps/cabinet-other:build/typecheck', 'packages/core:build/typecheck'],
  );
  assert.deepEqual(r.exempted, []);
});

test('известный долг: исключение без находок — устарело (долг закрыт — снять строку)', () => {
  const r = applyKnownDebt([], DEBT);
  assert.deepEqual(r.stale.map((d) => d.dir), ['apps/cabinet']);
});

test('KNOWN_DEBT ствола — ровно 4 приложения второго шага #2660, пара build/typecheck, со ссылкой', () => {
  assert.deepEqual(
    KNOWN_DEBT.map((d) => d.dir).sort(),
    ['apps/cabinet', 'apps/client', 'apps/demos/Research-Tree', 'apps/panel'],
  );
  for (const d of KNOWN_DEBT) {
    assert.deepEqual(d.tasks, ['build', 'typecheck']);
    assert.match(d.issue, /issues\/2660$/u);
    assert.ok(d.reason.length > 0);
  }
});

test('живой прогон по дереву зелёный: параллельные задачи пакетов пишут в разные файлы', () => {
  // Инвариант как у verify:build-order: зуб читает только исходные манифесты (package.json,
  // tsconfig*.json, turbo.json), артефакты сборки — нет; от состояния сборки не зависит.
  // Красный здесь = настоящее пересечение в дереве, не флейк; перезапуском не лечить.
  assert.ok(existsSync(TOOL), `предмет потерян: нет ${TOOL}`);
  let out;
  try {
    out = execFileSync(process.execPath, [TOOL, '--json'], { encoding: 'utf8' });
  } catch (e) {
    out = String(e.stdout ?? '');
    assert.ok(out.trim(), `зуб упал без отчёта: ${e.stderr ?? e.message}`);
  }
  const report = JSON.parse(out);
  assert.ok(report.packages > 0, 'пакетов не найдено — судить нечего');
  assert.deepEqual(
    report.findings.map((f) => `${f.pkg}: ${f.kind} ${f.a}/${f.b} ${f.path}`),
    [],
    'две задачи пакета, идущие параллельно, пишут один файл',
  );
  assert.deepEqual(report.stale, [], 'исключение KNOWN_DEBT устарело — снять строку');
  assert.equal(report.ok, true);
});
