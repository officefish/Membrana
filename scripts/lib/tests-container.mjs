import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { groupOf, normalizeCatalog, planTestRun } from './test-scripts-plan.mjs';

export const TEST_CATALOG_PATH = 'tests/test-scripts.catalog.json';

export function slash(p) {
  return String(p).split('\\').join('/');
}

export function loadTestCatalog(repoRoot) {
  const file = join(repoRoot, TEST_CATALOG_PATH);
  if (!existsSync(file)) throw new Error(`${TEST_CATALOG_PATH} отсутствует`);
  return normalizeCatalog(JSON.parse(readFileSync(file, 'utf8')));
}

export function discoverTestFiles(repoRoot, catalog = loadTestCatalog(repoRoot)) {
  const root = join(repoRoot, catalog.discovery.root);
  const suffix = catalog.discovery.suffix;
  const prune = new Set(catalog.discovery.prune ?? []);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!prune.has(entry.name)) walk(full);
      } else if (entry.name.endsWith(suffix)) {
        out.push(slash(relative(repoRoot, full)));
      }
    }
  };
  walk(root);
  return out.sort();
}

export function discoverSourceFiles(repoRoot, roots = ['scripts']) {
  const out = [];
  const exts = new Set(['.mjs', '.js', '.ts', '.tsx']);
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'cache', '.git'].includes(entry.name)) walk(full);
      } else if ([...exts].some((ext) => entry.name.endsWith(ext))) {
        out.push(slash(relative(repoRoot, full)));
      }
    }
  };
  for (const root of roots) {
    const full = join(repoRoot, root);
    if (existsSync(full)) walk(full);
  }
  return out.sort();
}

export function readImportSpecs(source) {
  const specs = [];
  const re =
    /\b(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
  for (const m of source.matchAll(re)) specs.push(m[1] ?? m[2]);
  return specs;
}

function resolveImport(repoRoot, importerRel, spec) {
  if (!spec.startsWith('.')) return null;
  const importerDir = dirname(join(repoRoot, importerRel));
  const base = resolve(importerDir, spec);
  const candidates = [
    base,
    `${base}.mjs`,
    `${base}.js`,
    `${base}.ts`,
    join(base, 'index.mjs'),
    join(base, 'index.js'),
    join(base, 'index.ts'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return slash(relative(repoRoot, c));
  }
  return null;
}

export function buildImportGraph(repoRoot, files = discoverSourceFiles(repoRoot)) {
  const importsByFile = new Map();
  const importersByFile = new Map();
  for (const file of files) {
    let source = '';
    try {
      source = readFileSync(join(repoRoot, file), 'utf8');
    } catch {
      importsByFile.set(file, []);
      continue;
    }
    const deps = readImportSpecs(source)
      .map((spec) => resolveImport(repoRoot, file, spec))
      .filter(Boolean)
      .sort();
    importsByFile.set(file, deps);
    for (const dep of deps) importersByFile.set(dep, [...(importersByFile.get(dep) ?? []), file]);
  }
  return { importsByFile, importersByFile };
}

export function collectImpacted(graph, changedFiles) {
  const queue = [...new Set(changedFiles.map(slash))];
  const impacted = new Set(queue);
  for (let i = 0; i < queue.length; i += 1) {
    for (const importer of graph.importersByFile.get(queue[i]) ?? []) {
      if (!impacted.has(importer)) {
        impacted.add(importer);
        queue.push(importer);
      }
    }
  }
  return impacted;
}

function smokeFiles(files, catalog) {
  const include = catalog.setups?.smoke?.include ?? [];
  const all = new Set(files);
  const missing = include.filter((f) => !all.has(f));
  return { run: include.filter((f) => all.has(f)).sort(), missing };
}

export function selectTestSetup({ repoRoot, setup = 'full', changedFiles = [], catalog, graph } = {}) {
  const cfg = normalizeCatalog(catalog ?? loadTestCatalog(repoRoot));
  const files = discoverTestFiles(repoRoot, cfg);
  const full = planTestRun({ files, catalog: cfg });
  const problems = [];
  let run = full.run;
  let impacted = new Set();

  if (setup === 'smoke') {
    const smoke = smokeFiles(full.run, cfg);
    run = smoke.run;
    problems.push(...smoke.missing.map((file) => `smoke file missing: ${file}`));
  } else if (setup === 'gate') {
    const smoke = smokeFiles(full.run, cfg);
    const g = graph ?? buildImportGraph(repoRoot);
    impacted = collectImpacted(g, changedFiles);
    const selected = new Set(smoke.run);
    for (const file of full.run) if (impacted.has(file)) selected.add(file);
    run = [...selected].sort();
    problems.push(...smoke.missing.map((file) => `smoke file missing: ${file}`));
  } else if (setup !== 'full') {
    throw new Error(`tests-container: неизвестный setup «${setup}» (есть: smoke, gate, full)`);
  }

  const notRun = full.run.filter((file) => !run.includes(file));
  if (run.length === 0) problems.push(`setup ${setup}: пустой прогон запрещен`);
  return {
    setup,
    run,
    skipped: full.skipped,
    notRun,
    changedFiles: changedFiles.map(slash).sort(),
    impacted: [...impacted].sort(),
    total: full.run.length,
    problems,
  };
}

export function decomposeTests(repoRoot, catalog = loadTestCatalog(repoRoot)) {
  const files = discoverTestFiles(repoRoot, catalog);
  const out = new Map();
  for (const file of planTestRun({ files, catalog }).run) {
    const group = groupOf(file, catalog);
    out.set(group, [...(out.get(group) ?? []), file]);
  }
  return out;
}

export function inspectTest(repoRoot, file, catalog = loadTestCatalog(repoRoot)) {
  const rel = slash(file);
  const graph = buildImportGraph(repoRoot);
  return {
    file: rel,
    exists: existsSync(join(repoRoot, rel)),
    group: groupOf(rel, catalog),
    imports: graph.importsByFile.get(rel) ?? [],
    importers: graph.importersByFile.get(rel) ?? [],
  };
}

export function changedFromGit(repoRoot, ref = 'origin/main') {
  const r = spawnSync('git', ['diff', '--name-only', `${ref}...HEAD`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (r.status !== 0) return [];
  return r.stdout
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(slash);
}

export function formatSetupReport(plan) {
  const lines = [
    `tests:${plan.setup}: run=${plan.run.length}/${plan.total}, not run=${plan.notRun.length}, skipped=${plan.skipped.length}`,
  ];
  if (plan.changedFiles.length) lines.push(`changed: ${plan.changedFiles.join(', ')}`);
  if (plan.notRun.length) lines.push(`not run: ${plan.notRun.join(', ')}`);
  for (const { file, reason } of plan.skipped) lines.push(`skipped: ${file} — ${reason}`);
  for (const problem of plan.problems) lines.push(`problem: ${problem}`);
  return lines.join('\n');
}
