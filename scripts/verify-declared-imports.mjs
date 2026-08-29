#!/usr/bin/env node
/**
 * yarn verify:declared-imports — зуб «импортируешь — объяви».
 *
 * Сверяет ФАКТИЧЕСКИЕ импорты рабочих пакетов из исходников с ОБЪЯВЛЕННЫМИ в их манифестах.
 * Обоснование и границы правила — в `scripts/lib/declared-imports.mjs`; здесь только обход
 * файловой системы и печать.
 *
 * Usage:
 *   node scripts/verify-declared-imports.mjs
 *   node scripts/verify-declared-imports.mjs --json
 *
 * Exit: 0 — все импорты объявлены · 1 — есть необъявленные · 2 — ошибка входа.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { declaredWorkspaces, importedWorkspaces, undeclaredImports } from './lib/declared-imports.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Те же каталоги воркспейсов, что у соседнего сторожа образов — один список на оба. */
const WORKSPACE_DIRS = ['packages', 'packages/libs', 'packages/services', 'packages/services/detectors', 'apps'];

const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'generated', 'coverage', 'release', 'build']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (CODE.test(entry.name)) out.push(full);
  }
  return out;
}

function readWorkspaces() {
  const list = [];
  for (const dir of WORKSPACE_DIRS) {
    const abs = resolve(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(abs, entry.name, 'package.json');
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (typeof pkg.name !== 'string') continue;
      list.push({ name: pkg.name, dir: `${dir}/${entry.name}`, abs: join(abs, entry.name), pkg });
    }
  }
  return list;
}

function main(argv) {
  const asJson = argv.includes('--json');
  const workspaces = readWorkspaces();
  const known = new Set(workspaces.map((w) => w.name));
  const findings = [];

  for (const ws of workspaces) {
    const srcDir = join(ws.abs, 'src');
    const root = existsSync(srcDir) && statSync(srcDir).isDirectory() ? srcDir : ws.abs;
    const imported = new Set();
    for (const file of walk(root)) {
      for (const dep of importedWorkspaces(readFileSync(file, 'utf8'))) imported.add(dep);
    }
    findings.push(...undeclaredImports(ws.name, imported, declaredWorkspaces(ws.pkg), known));
  }

  if (asJson) {
    console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
  } else if (findings.length === 0) {
    console.log('verify:declared-imports — ✓ каждый импорт рабочего пакета объявлен в манифесте');
  } else {
    console.error(`verify:declared-imports — находок: ${findings.length} (импорт есть, объявления нет):`);
    for (const f of findings) console.error(`  ✗ ${f.pkg} импортирует ${f.dep}, но не объявляет его`);
    console.error('  почему это важно: локально резолвится старым dist соседа и потому невидимо,');
    console.error('  а в CI даёт красноту в четырёх местах сразу, ни одно из которых не назовёт причину.');
    console.error('  лекарство: добавить пакет в dependencies (или devDependencies, если он нужен только тестам)');
  }
  return findings.length === 0 ? 0 : 1;
}

if (process.argv[1]?.endsWith('verify-declared-imports.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`verify:declared-imports — ошибка входа: ${error?.message ?? error}`);
    process.exit(2);
  }
}
