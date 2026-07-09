#!/usr/bin/env node
/**
 * yarn build:affected — пересобрать dist ИЗМЕНЁННЫХ `packages/*` (через turbo),
 * чтобы downstream typecheck/тесты не резолвили устаревшие типы соседей из dist.
 * По итогам сессии 2026-07-08 (многократно вручную `yarn workspace X build`).
 *
 * Usage: yarn build:affected   (по умолчанию — незакоммиченные + staged изменения)
 */
import { execFileSync } from 'node:child_process';

const norm = (p) => p.trim().replace(/\\/g, '/');

/**
 * Какие пакет-директории затронуты изменёнными путями (longest-prefix match).
 * Корректно для вложенных пакетов (packages/services/detectors/base). apps/* не
 * берём — build:affected про dist ПАКЕТОВ (downstream резолвит их типы).
 * @param {string[]} changedPaths
 * @param {string[]} packageDirs — реальные директории пакетов (где лежит package.json)
 * @returns {string[]}
 */
export function affectedPackageDirs(changedPaths, packageDirs) {
  const pkgs = [...new Set(packageDirs.map(norm))]
    .filter((d) => d.startsWith('packages/'))
    .sort((a, b) => b.length - a.length); // длинные первыми — точный prefix для вложенных
  const hit = new Set();
  for (const raw of changedPaths) {
    const p = norm(raw);
    const match = pkgs.find((d) => p === d || p.startsWith(`${d}/`));
    if (match) hit.add(match);
  }
  return [...hit].sort();
}

function discoverPackageDirs() {
  const out = execFileSync('git', ['ls-files', '*/package.json'], { encoding: 'utf8' });
  return out
    .split('\n')
    .filter(Boolean)
    .map((f) => norm(f).replace(/\/package\.json$/, ''));
}

function changedPathsFromGit() {
  const porcelain = execFileSync('git', ['status', '--porcelain', '-uall'], { encoding: 'utf8' });
  const staged = execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' });
  return [...porcelain.split('\n').map((l) => l.slice(3)), ...staged.split('\n')].filter(Boolean);
}

function main() {
  const dirs = affectedPackageDirs(changedPathsFromGit(), discoverPackageDirs());
  if (dirs.length === 0) {
    console.log('build:affected: изменённых packages/* нет — нечего пересобирать.');
    return;
  }
  const filters = dirs.flatMap((d) => ['--filter', `./${d}`]);
  console.log(`build:affected: turbo run build ${filters.join(' ')}`);
  execFileSync('yarn', ['turbo', 'run', 'build', ...filters], { stdio: 'inherit' });
}

if (process.argv[1]?.endsWith('build-affected.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
}
