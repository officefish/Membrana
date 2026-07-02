// Tailwind coverage for the monorepo: an app's tailwind.config `content` must scan
// the `src/` of every @membrana UI package it (transitively) depends on, or those
// packages' utility classes are never generated and their layout collapses.
//
// Source of truth: a machine-readable `<!-- tailwind-content: [...] -->` block in each
// UI package's README (see TWC-L1). This lib derives the required `content` globs for
// each app from the package dependency graph + those frontmatter blocks.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

/** Apps whose tailwind.config must be kept covered. */
export const TAILWIND_APPS = ['apps/client', 'apps/cabinet'];

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '.git']);

/** Recursively collect every package.json under a root dir (skips build/node dirs). */
function collectPackageJsons(dir, cwd, out) {
  let entries;
  try {
    entries = readdirSync(resolve(cwd, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      collectPackageJsons(join(dir, entry.name), cwd, out);
    } else if (entry.name === 'package.json') {
      out.push(dir);
    }
  }
  return out;
}

/** Parse the `tailwind-content` JSON array from a package README, or null. */
export function readmeTailwindContent(pkgDir, cwd = process.cwd()) {
  const readme = resolve(cwd, pkgDir, 'README.md');
  if (!existsSync(readme)) return null;
  const match = readFileSync(readme, 'utf8').match(/tailwind-content:\s*(\[[^\]]*\])/u);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Build a map of @membrana package name -> { dir, deps[], content|null }.
 * `content` is the README frontmatter globs (null if the package declares none).
 */
export function scanMembranaPackages(cwd = process.cwd()) {
  const dirs = collectPackageJsons('packages', cwd, []);
  const map = new Map();
  for (const dir of dirs) {
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(resolve(cwd, dir, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    if (typeof pkg.name !== 'string' || !pkg.name.startsWith('@membrana/')) continue;
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).filter((d) =>
      d.startsWith('@membrana/'),
    );
    map.set(pkg.name, { dir, deps, content: readmeTailwindContent(dir, cwd) });
  }
  return map;
}

/** Transitive @membrana dependency names of an app (from its package.json). */
export function transitiveMembranaDeps(appDir, pkgMap, cwd = process.cwd()) {
  let appPkg;
  try {
    appPkg = JSON.parse(readFileSync(resolve(cwd, appDir, 'package.json'), 'utf8'));
  } catch {
    return [];
  }
  const seen = new Set();
  const queue = Object.keys({ ...appPkg.dependencies, ...appPkg.peerDependencies }).filter((d) =>
    d.startsWith('@membrana/'),
  );
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const node = pkgMap.get(name);
    if (node) for (const dep of node.deps) if (!seen.has(dep)) queue.push(dep);
  }
  return [...seen];
}

/** Convert a package-relative glob to an app-relative POSIX glob. */
export function toAppRelativeGlob(appDir, pkgDir, glob) {
  const stripped = glob.replace(/^\.\//u, '');
  const rel = relative(appDir, pkgDir).split('\\').join('/');
  return `${rel}/${stripped}`;
}

/** Required tailwind content globs for an app (from transitive UI deps' frontmatter). */
export function requiredContentForApp(appDir, pkgMap, cwd = process.cwd()) {
  const required = [];
  for (const name of transitiveMembranaDeps(appDir, pkgMap, cwd)) {
    const node = pkgMap.get(name);
    if (!node?.content) continue;
    for (const glob of node.content) required.push(toAppRelativeGlob(appDir, node.dir, glob));
  }
  return [...new Set(required)].sort();
}

/** Read the raw `content` array entries from an app's tailwind.config.js. */
export function readAppContent(appDir, cwd = process.cwd()) {
  const configPath = resolve(cwd, appDir, 'tailwind.config.js');
  if (!existsSync(configPath)) return null;
  const text = readFileSync(configPath, 'utf8');
  const block = text.match(/content:\s*\[([\s\S]*?)\]/u);
  if (!block) return [];
  return [...block[1].matchAll(/['"]([^'"]+)['"]/gu)].map((m) => m[1]);
}

/** Missing required globs per app: { [appDir]: string[] }. Empty arrays = covered. */
export function findMissingCoverage(cwd = process.cwd(), apps = TAILWIND_APPS) {
  const pkgMap = scanMembranaPackages(cwd);
  const report = {};
  for (const appDir of apps) {
    const required = requiredContentForApp(appDir, pkgMap, cwd);
    const actual = new Set(readAppContent(appDir, cwd) ?? []);
    report[appDir] = required.filter((glob) => !actual.has(glob));
  }
  return report;
}
