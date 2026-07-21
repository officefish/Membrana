#!/usr/bin/env node
/**
 * yarn procedures:registry [--check] — валидация реестра процедур и генерация
 * проекции docs/procedures/REGISTRY.md (Р5, вердикт m5-migration-manual).
 * --check: проекция не разъехалась с источником (зуб для CI).
 * Exit: 0 ок · 1 дефекты/дрейф · 2 инструментальная ошибка.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registryProblems, renderRegistryMd } from './lib/procedures-registry.mjs';
import { listProcedureDirs } from './lib/validate-procedure.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = resolve(repoRoot, 'docs/procedures/registry.json');
const outPath = resolve(repoRoot, 'docs/procedures/REGISTRY.md');

let reg;
let taskIds;
try {
  reg = JSON.parse(readFileSync(srcPath, 'utf8'));
  const tasks = JSON.parse(readFileSync(resolve(repoRoot, 'docs/tasks/registry.json'), 'utf8'));
  taskIds = (tasks.tasks ?? tasks).map((t) => t.id);
} catch (e) {
  console.error(`✖ инструментальная ошибка: ${e.message}`);
  process.exit(2);
}

const containerIds = listProcedureDirs(repoRoot).map((d) => basename(d));
const problems = registryProblems(reg, {
  taskIds,
  containerIds,
  dirExists: (p) => existsSync(join(repoRoot, p)),
});
if (problems.length > 0) {
  console.error(`✖ реестр процедур: дефекты (${problems.length}):`);
  for (const p of problems) console.error(`  ✖ ${p}`);
  process.exit(1);
}

const md = renderRegistryMd(reg);
if (process.argv.includes('--check')) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== md) {
    console.error('✖ REGISTRY.md разъехался с источником — перегенерируй: yarn procedures:registry');
    process.exit(1);
  }
  console.log(`Реестр валиден (${reg.procedures.length} процедур), проекция синхронна.`);
} else {
  writeFileSync(outPath, md);
  console.log(`Проекция: docs/procedures/REGISTRY.md (${reg.procedures.length} процедур)`);
}
