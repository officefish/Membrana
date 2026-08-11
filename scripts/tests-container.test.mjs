import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildImportGraph, formatSetupReport, selectTestSetup, workspacePackageDirs,
} from './lib/tests-container.mjs';

const repoRoot = process.cwd();

test('smoke — выборочный набор с честным not run отчетом', () => {
  const plan = selectTestSetup({ repoRoot, setup: 'smoke' });
  assert.ok(plan.run.length > 0);
  assert.ok(plan.notRun.length > 0, 'smoke обязан назвать непокрытую часть full-набора');
  const report = formatSetupReport(plan);
  assert.match(report, /not run=/u);
  assert.match(report, /not run:/u);
});

test('gate включает smoke и тесты, зависящие от измененного файла', () => {
  const plan = selectTestSetup({
    repoRoot,
    setup: 'gate',
    changedFiles: ['scripts/lib/test-scripts-plan.mjs'],
  });
  assert.ok(plan.run.includes('scripts/test-list-coverage.test.mjs'));
  assert.ok(plan.run.includes('scripts/lib/test-scripts-plan.test.mjs'));
  assert.ok(plan.notRun.length > 0);
});

test('full — весь набор без not run', () => {
  const plan = selectTestSetup({ repoRoot, setup: 'full' });
  assert.equal(plan.notRun.length, 0);
  assert.equal(plan.run.length, plan.total);
});

// ── b3 s-queue-2026-08-11: граф видит @membrana/* и .tsx ─────────────────────

test('workspacePackageDirs: карта воркспейсов живого дерева непуста и несёт core', () => {
  const map = workspacePackageDirs(repoRoot);
  assert.ok(map.size >= 30, `воркспейсов ${map.size} — карта не построилась`);
  assert.ok(map.has('@membrana/core'), 'ядро не найдено — глоб packages/* не раскрыт');
});

test('resolveImport через граф: спек @membrana/* даёт ребро, голый сторонний — нет', () => {
  // До b3 resolveImport открывался «if (!spec.startsWith(.)) return null» —
  // ЛЮБОЙ не-относительный спек выпадал из графа, и gate-ярус недобирал
  // зависимые тесты. Живой замер 11.08: +11 рёбер из scripts/ в пакеты.
  const g = buildImportGraph(repoRoot);
  let membranaEdges = 0;
  for (const deps of g.importsByFile.values()) {
    for (const d of deps) if (!d.startsWith('scripts/')) membranaEdges += 1;
  }
  assert.ok(membranaEdges > 0, 'рёбер @membrana/* нет — резолвер снова слеп к воркспейсам');
  // node:* и сторонние пакеты рёбрами не становятся — проверено отсутствием
  // node_modules-путей в графе.
  for (const deps of g.importsByFile.values()) {
    for (const d of deps) assert.ok(!d.includes('node_modules'), `ребро в node_modules: ${d}`);
  }
});

test('resolveImport: .tsx в кандидатах — файл и index (fixture)', () => {
  // Кандидаты общие для относительных и воркспейс-спеков (fileCandidates):
  // относительный импорт без расширения обязан находить .tsx и index.tsx.
  const dir = mkdtempSync(join(tmpdir(), 'tc-tsx-'));
  mkdirSync(join(dir, 'scripts', 'ui'), { recursive: true });
  writeFileSync(join(dir, 'scripts', 'ui', 'Panel.tsx'), 'export const P = 1;\n');
  writeFileSync(join(dir, 'scripts', 'ui', 'index.tsx'), 'export const I = 1;\n');
  writeFileSync(join(dir, 'scripts', 'a.mjs'), "import './ui/Panel';\nimport './ui';\n");
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fx', workspaces: [] }));
  const g = buildImportGraph(dir, ['scripts/a.mjs', 'scripts/ui/Panel.tsx', 'scripts/ui/index.tsx']);
  assert.deepEqual(g.importsByFile.get('scripts/a.mjs'), ['scripts/ui/Panel.tsx', 'scripts/ui/index.tsx']);
  rmSync(dir, { recursive: true, force: true });
});

test('порядок кандидатов расширений — контракт: .ts раньше .tsx', () => {
  // При сосуществовании foo.ts и foo.tsx выбор обязан быть детерминирован.
  const dir = mkdtempSync(join(tmpdir(), 'tc-ord-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'scripts', 'foo.ts'), 'export const A = 1;\n');
  writeFileSync(join(dir, 'scripts', 'foo.tsx'), 'export const B = 1;\n');
  writeFileSync(join(dir, 'scripts', 'a.mjs'), "import './foo';\n");
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fx', workspaces: [] }));
  const g = buildImportGraph(dir, ['scripts/a.mjs', 'scripts/foo.ts', 'scripts/foo.tsx']);
  assert.deepEqual(g.importsByFile.get('scripts/a.mjs'), ['scripts/foo.ts']);
  rmSync(dir, { recursive: true, force: true });
});
