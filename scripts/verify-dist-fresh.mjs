#!/usr/bin/env node
/**
 * yarn verify:dist-fresh — dist пакетов соответствует исходникам ПО СОДЕРЖИМОМУ (#2525,
 * спринт stale-dist-turbo-cache-2525, блок b2).
 *
 * Для каждого пакета `packages/**` с `tsBuildInfoFile` в tsconfig.json читается манифест
 * `.tsbuildinfo`, и версия каждого исходника под `rootDir` (sha256, как хранит tsc)
 * сверяется с хешем файла на диске. Часы не участвуют: `tsc -b` судит по mtime и потому
 * молчал на отравленном dist (E2/E7 фазы 1); этот зуб судит по байтам.
 *
 * Исходы по пакету: fresh · stale (с именами файлов) · dist_missing (манифест есть,
 * объявленная точка входа dist — нет) · absent (манифеста нет: пакет не собирался в этом
 * дереве — не красный, но и не «свежий»). Красный — stale/dist_missing → exit 1.
 *
 * Лечение красного: `yarn turbo run build --filter=<pkg>` (сборка с b1 — всегда полный
 * эмит); для записи, уже отравленной в общем кеше до b1: `yarn workspace <pkg> clean` и
 * `yarn turbo run build --filter=<pkg> --force`.
 *
 * Usage:
 *   yarn verify:dist-fresh                     # все пакеты
 *   yarn verify:dist-fresh --filter @membrana/plugin-contracts [--filter …]
 *
 * Ядро — `scripts/lib/dist-freshness.mjs` (чистое, покрыто зубом); здесь ФС, вывод и код возврата.
 * Соседний прибор `yarn build:affected` ПЕРЕСОБИРАЕТ dist изменённых пакетов; этот — только
 * судит и ничего не пишет.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FRESHNESS, hashSourceText, isRed, judgeDistFreshness, manifestSources } from './lib/dist-freshness.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slash = (p) => p.split('\\').join('/');

function parseArgs(argv) {
  const out = { filters: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--filter') {
      const v = argv[++i];
      if (!v) throw new Error('--filter требует имя пакета');
      out.filters.push(v);
    } else throw new Error(`неизвестный аргумент «${argv[i]}»`);
  }
  return out;
}

/** Пакеты packages/** с tsBuildInfoFile: имя, каталог, манифест, rootDir, точка входа dist. */
export function discoverPackages(root = REPO_ROOT) {
  const files = execFileSync('git', ['ls-files', 'packages/*/package.json', 'packages/*/*/package.json', 'packages/*/*/*/package.json'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split(/\r?\n/u)
    .filter(Boolean);
  const out = [];
  for (const rel of files) {
    const dir = join(root, dirname(rel));
    const tsconfigPath = join(dir, 'tsconfig.json');
    if (!existsSync(tsconfigPath)) continue;
    let pkg;
    let tsconfig;
    try {
      pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    } catch {
      continue;
    }
    const buildInfoFile = tsconfig?.compilerOptions?.tsBuildInfoFile;
    if (typeof buildInfoFile !== 'string') continue;
    const entry = pkg.types ?? pkg.main ?? null;
    out.push({
      name: pkg.name ?? slash(dirname(rel)),
      dir,
      buildInfoPath: resolve(dir, buildInfoFile),
      rootDir: tsconfig.compilerOptions?.rootDir ?? './src',
      entryPath: entry ? resolve(dir, entry) : null,
    });
  }
  return out;
}

/** Замер одного пакета: манифест → хеши с диска → вердикт ядра. */
export function measurePackage(p) {
  let manifest = null;
  if (existsSync(p.buildInfoPath)) {
    try {
      manifest = manifestSources(JSON.parse(readFileSync(p.buildInfoPath, 'utf8')), { rootDir: p.rootDir });
    } catch {
      manifest = null;
    }
  }
  const base = dirname(p.buildInfoPath);
  const current = new Map();
  for (const { name } of manifest ?? []) {
    const abs = resolve(base, name);
    current.set(name, existsSync(abs) ? hashSourceText(readFileSync(abs, 'utf8')) : null);
  }
  const distPresent = p.entryPath ? existsSync(p.entryPath) : existsSync(join(p.dir, 'dist'));
  return judgeDistFreshness({ manifest, current, distPresent });
}

function main(argv) {
  const { filters } = parseArgs(argv);
  const all = discoverPackages();
  const packages = filters.length > 0 ? all.filter((p) => filters.includes(p.name)) : all;
  if (packages.length === 0) {
    console.error(`verify:dist-fresh — пакетов не найдено${filters.length ? ` по фильтру ${filters.join(', ')}` : ''}`);
    return 2;
  }
  const counts = { [FRESHNESS.FRESH]: 0, [FRESHNESS.STALE]: 0, [FRESHNESS.DIST_MISSING]: 0, [FRESHNESS.ABSENT]: 0 };
  let red = false;
  for (const p of packages) {
    const res = measurePackage(p);
    counts[res.state] += 1;
    const mark = isRed(res.state) ? '✖' : res.state === FRESHNESS.ABSENT ? '·' : '✓';
    console.log(`${mark} ${res.state.padEnd(12)} ${p.name}`);
    for (const f of res.files) console.log(`    ${slash(relative(REPO_ROOT, resolve(dirname(p.buildInfoPath), f.name)))} — ${f.reason}`);
    if (isRed(res.state)) red = true;
  }
  console.log(
    `verify:dist-fresh — пакетов ${packages.length}: fresh ${counts.fresh} · stale ${counts.stale} · ` +
      `dist_missing ${counts.dist_missing} · absent ${counts.absent}`,
  );
  if (red) {
    console.error('verify:dist-fresh — КРАСНЫЙ: dist отстал от исходников. Лечение: yarn turbo run build --filter=<pkg>');
    return 1;
  }
  return 0;
}

if (process.argv[1]?.endsWith('verify-dist-fresh.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(`verify:dist-fresh — ${String(e.message ?? e)}`);
    process.exit(2);
  }
}
