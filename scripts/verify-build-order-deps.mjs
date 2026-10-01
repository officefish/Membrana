#!/usr/bin/env node
/**
 * yarn verify:build-order — зуб «порядок сборки объявлен там, где его читает turbo» (#2436).
 *
 * Судит две вещи, и обе — с названным предметом:
 *   1) `turbo.json`: задачи, зависящие от сборки соседей, несут `dependsOn: ["^build"]`;
 *   2) каждый рабочий пакет: сосед, названный в его `tsconfig*.json` (`references`/`paths`),
 *      объявлен и в `package.json` — иначе «^» его не развернёт и порядок держится на удаче.
 *
 * Обоснование и границы — в `scripts/lib/build-order-deps.mjs`; здесь обход ФС и печать.
 *
 * Usage:
 *   node scripts/verify-build-order-deps.mjs
 *   node scripts/verify-build-order-deps.mjs --json
 *
 * Exit: 0 — порядок объявлен · 1 — есть расхождения · 2 — ошибка входа.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildOrderGaps,
  declaredDependencies,
  pathsWorkspaces,
  referencePaths,
  undeclaredBuildOrder,
} from './lib/build-order-deps.mjs';
import { workspaceSearchPaths } from './lib/workspace-dirs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TURBO_JSON = join(ROOT, 'turbo.json');

const TSCONFIG = /^tsconfig.*\.json$/u;

function toPosix(p) {
  return p.split('\\').join('/');
}

function addPackage(list, dir) {
  const abs = resolve(ROOT, dir);
  const pkgPath = join(abs, 'package.json');
  if (!existsSync(pkgPath)) return;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (typeof pkg.name !== 'string') return;
  list.push({ name: pkg.name, dir: toPosix(dir), abs, pkg });
}

export function readWorkspaces(root = ROOT) {
  const search = workspaceSearchPaths(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')));
  const list = [];
  for (const parent of search.parents) {
    const abs = resolve(root, parent);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) addPackage(list, `${parent}/${entry.name}`);
    }
  }
  for (const exact of search.packages) addPackage(list, exact);
  return list;
}

/** Кого называет порядок сборки пакета: `paths` по имени, `references` — по каталогу. */
export function namedByTsconfig(ws, byDir) {
  const named = new Set();
  for (const file of readdirSync(ws.abs).filter((f) => TSCONFIG.test(f))) {
    const text = readFileSync(join(ws.abs, file), 'utf8');
    for (const name of pathsWorkspaces(text)) named.add(name);
    for (const rel of referencePaths(text)) {
      const target = posix.normalize(posix.join(ws.dir, rel)).replace(/\/$/u, '');
      const name = byDir.get(target);
      if (name) named.add(name);
    }
  }
  return named;
}

function main(argv) {
  const asJson = argv.includes('--json');

  // предмет первой проверки: turbo.json существует и разбирается
  if (!existsSync(TURBO_JSON)) throw new Error(`предмет зуба потерян: нет ${TURBO_JSON}`);
  const turbo = JSON.parse(readFileSync(TURBO_JSON, 'utf8'));
  const gaps = buildOrderGaps(turbo);

  const workspaces = readWorkspaces();
  const known = new Set(workspaces.map((w) => w.name));
  const byDir = new Map(workspaces.map((w) => [w.dir, w.name]));
  const findings = [];
  for (const ws of workspaces) {
    const missing = undeclaredBuildOrder(
      ws.name,
      namedByTsconfig(ws, byDir),
      declaredDependencies(ws.pkg),
      known,
    );
    for (const dep of missing) findings.push({ pkg: ws.name, dir: ws.dir, dep });
  }

  const ok = findings.length === 0 && gaps.missingTask.length === 0 && gaps.missingDependsOn.length === 0;

  if (asJson) {
    console.log(JSON.stringify({ ok, gaps, findings }, null, 2));
  } else if (ok) {
    console.log(
      `verify:build-order — ✓ ${workspaces.length} пакет(ов): порядок сборки объявлен и в tsconfig, и в манифесте`,
    );
  } else {
    for (const name of gaps.missingTask) {
      console.error(`  ✗ turbo.json: нет задачи «${name}» — судить нечего, предмет проверки пропал`);
    }
    for (const name of gaps.missingDependsOn) {
      console.error(`  ✗ turbo.json: задача «${name}» не ждёт сборки соседей (нет dependsOn ["^build"])`);
    }
    for (const f of findings) {
      console.error(`  ✗ ${f.pkg} (${f.dir}): tsconfig называет ${f.dep}, package.json — нет`);
    }
    console.error('  почему это важно: «^build» разворачивается по манифесту, а не по tsconfig.');
    console.error('  Сосед, названный только в tsconfig, для turbo невидим: его сборку никто не');
    console.error('  заказал, и попадёт ли она раньше — вопрос очереди. Локально незаметно (dist');
    console.error('  соседа лежит от прежних сборок), в CI — красный через раз и зелёный с перезапуска.');
    console.error('  лекарство: добавить соседа в dependencies (или devDependencies, если он нужен только типам).');
  }
  return ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('verify-build-order-deps.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`verify:build-order — ошибка входа: ${error?.message ?? error}`);
    process.exit(2);
  }
}
