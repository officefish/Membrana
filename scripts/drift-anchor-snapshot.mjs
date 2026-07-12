#!/usr/bin/env node
/**
 * Drift-Anchor — сборщик структурного снимка (DA1, Якорь-A).
 *
 * Детерминированно вычисляет структурные компоненты состояния репо (консилиум
 * nightly-agents-platform): активные ID реестра, граф зависимостей пакетов,
 * чек-сумма роль/процесс-промптов, канон архитектуры. Выход — Snapshot JSON
 * (контракт @membrana/drift-anchor). Вердикт считает computeDrift снаружи.
 *
 * Usage:
 *   node scripts/drift-anchor-snapshot.mjs                 # печатает снимок в stdout
 *   node scripts/drift-anchor-snapshot.mjs --out <path>    # пишет снимок в файл
 *   node scripts/drift-anchor-snapshot.mjs --write-baseline # обновляет docs/anchors/baseline.json (осознанно!)
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** Активные ID реестра, отсортированы → хэш (дрейф = задачи добавлены/исчезли). */
export function hashActiveRegistryIds(registryText) {
  const reg = JSON.parse(registryText);
  const ids = (reg.tasks ?? [])
    .filter((t) => t.status === 'active')
    .map((t) => t.id)
    .sort();
  return sha256(ids.join('\n'));
}

/** Граф зависимостей @membrana/* между пакетами → хэш (дрейф = новые кросс-пакетные связи). */
export function hashDependencyGraph(packageJsons) {
  const edges = [];
  for (const { name, deps } of packageJsons) {
    for (const dep of deps) {
      if (dep.startsWith('@membrana/')) edges.push(`${name} -> ${dep}`);
    }
  }
  return sha256([...new Set(edges)].sort().join('\n'));
}

/** Чек-сумма набора файлов (отсортированы по пути) → хэш. */
export function hashFileSet(files) {
  const parts = [...files]
    .filter((f) => f.content !== null)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((f) => `${f.path}\n${f.content}`);
  return sha256(parts.join('\n---\n'));
}

const PKG_ROOTS = [
  'packages',
  'packages/libs',
  'packages/services',
  'packages/services/detectors',
  'apps',
];

function readPackageJsons() {
  const out = [];
  for (const rel of PKG_ROOTS) {
    const dir = join(ROOT, rel);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pjPath = join(dir, entry.name, 'package.json');
      if (!existsSync(pjPath)) continue;
      try {
        const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
        const deps = Object.keys({ ...pj.dependencies, ...pj.devDependencies });
        out.push({ name: pj.name ?? `${rel}/${entry.name}`, deps });
      } catch {
        /* skip malformed */
      }
    }
  }
  return out;
}

function readMaybe(rel) {
  const p = join(ROOT, rel);
  return { path: rel, content: existsSync(p) ? readFileSync(p, 'utf8') : null };
}

const ROLE_PROMPT_FILES = [
  'docs/VIRTUAL_TEAM_PROMPT.md',
  'docs/prompts/CONSILIUM_PROMPT.md',
  'AGENTS.md',
  '.cursorrules',
];

export function buildSnapshot(now = new Date()) {
  const registryText = readFileSync(join(ROOT, 'docs/tasks/registry.json'), 'utf8');
  const pkgs = readPackageJsons();
  const rolePrompts = ROLE_PROMPT_FILES.map(readMaybe);
  const architecture = [readMaybe('docs/ARCHITECTURE.md')];

  return {
    takenAt: now.toISOString(),
    components: [
      { id: 'registry-active-ids', kind: 'structural', value: hashActiveRegistryIds(registryText) },
      { id: 'dependency-graph', kind: 'structural', value: hashDependencyGraph(pkgs) },
      { id: 'role-prompts', kind: 'structural', value: hashFileSet(rolePrompts) },
      { id: 'architecture-canon', kind: 'structural', value: hashFileSet(architecture) },
    ],
  };
}

function main() {
  const args = process.argv.slice(2);
  const snapshot = buildSnapshot();
  const json = JSON.stringify(snapshot, null, 2);

  if (args.includes('--write-baseline')) {
    const baselinePath = join(ROOT, 'docs/anchors/baseline.json');
    // baseline фиксирует takenAt пустым — сравниваются только компоненты, не время
    const baseline = { ...snapshot, takenAt: 'BASELINE' };
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
    console.error(`baseline записан: docs/anchors/baseline.json (осознанное обновление — коммит + LGTM)`);
    return;
  }

  const outIdx = args.indexOf('--out');
  if (outIdx >= 0 && args[outIdx + 1]) {
    writeFileSync(resolve(args[outIdx + 1]), json + '\n', 'utf8');
    console.error(`snapshot записан: ${args[outIdx + 1]}`);
    return;
  }

  process.stdout.write(json + '\n');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('drift-anchor-snapshot.mjs')) {
  main();
}
