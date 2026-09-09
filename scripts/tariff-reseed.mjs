#!/usr/bin/env node
/**
 * yarn tariff:reseed [--dry-run] [--check] — пересев тарифной сетки из релиза матрицы
 * (спринт tariff-matrix-2331, b4; T15 «релиз рождает производные; пересев — глагол»).
 *
 * Читает `docs/containers/strategic-docs/releases/tariff-matrix/release.json`, по pins —
 * `granules/<id>/resource.json`, проецирует (scripts/lib/tariff-matrix/reseed.mjs) и пишет
 * `docs/tariffs/tariff-grid.json`. Сетка — производная; править руками нельзя (T16).
 *
 *   --dry-run   печать проекции в stdout, файл не трогать
 *   --check     не писать: сравнить сетку на диске с проекцией, напечатать пути расхождения
 *   --release <path> · --granules <dir> · --grid <path>   (для фикстур и тестов)
 *
 * Exit: 0 — записано / совпадает; 1 — --check нашёл расхождение; 2 — инструментальная
 * ошибка (нет релиза, гранула не читается, проекция не собирается).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { releaseCrossFindings } from './lib/tariff-grid-check.mjs';
import { projectGrid, ReseedError, serializeGrid } from './lib/tariff-matrix/reseed.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_PATHS = Object.freeze({
  release: 'docs/containers/strategic-docs/releases/tariff-matrix/release.json',
  granules: 'docs/containers/strategic-docs/granules',
  grid: 'docs/tariffs/tariff-grid.json',
});

/** Инструментальная ошибка ввода-вывода: релиза нет / гранула не читается → exit 2. */
export class ReseedIoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReseedIoError';
  }
}

function readJson(path, what) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new ReseedIoError(`${what} не читается: ${path} (${e.message})`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new ReseedIoError(`${what} не JSON: ${path} (${e.message})`);
  }
}

/**
 * Загрузить релиз матрицы и гранулы по pins. Релиза нет → ReseedIoError, не «пусто»:
 * без релиза пересев не состоялся, а зуб обязан быть красным/инструментальным, не зелёным.
 * @param {{ release?: string, granules?: string }} [paths] абсолютные пути (по умолчанию — репо)
 * @returns {{ release: object, granules: Map<string, object>, releasePath: string }}
 */
export function loadMatrixRelease(paths = {}) {
  const releasePath = paths.release ?? join(repoRoot, DEFAULT_PATHS.release);
  const granulesDir = paths.granules ?? join(repoRoot, DEFAULT_PATHS.granules);
  if (!existsSync(releasePath)) {
    throw new ReseedIoError(`релиза матрицы нет — пересев не состоялся: ожидался ${releasePath}`);
  }
  const release = readJson(releasePath, 'release.json');
  if (!release?.pins || typeof release.pins !== 'object') {
    throw new ReseedIoError(`release.json без pins — гранулы матрицы не названы: ${releasePath}`);
  }
  const granules = new Map();
  for (const [id, pin] of Object.entries(release.pins)) {
    const dir = join(granulesDir, id);
    const resourcePath = join(dir, 'resource.json');
    const granulePath = join(dir, 'granule.json');
    let granule = null;
    if (existsSync(granulePath)) {
      granule = readJson(granulePath, `гранула ${id} (granule.json)`);
      if (granule.version != null && granule.version !== pin) {
        throw new ReseedIoError(
          `гранула ${id}: релиз pin ${pin}, в дереве версия ${granule.version} — релиз устарел, пересобрать (strategic-docs:generate)`,
        );
      }
    }
    if (!existsSync(resourcePath)) {
      // Прозаическая гранула матрицы (назначение; literal с body.md) — не ресурс: в сетку не
      // проецируется, но обязана существовать как гранула, иначе pin указывает в пустоту.
      if (granule && granule.kind === 'literal') {
        granules.set(id, null);
        continue;
      }
      throw new ReseedIoError(`гранула ${id} (resource.json) не читается: ${resourcePath} — нет файла`);
    }
    granules.set(id, readJson(resourcePath, `гранула ${id} (resource.json)`));
  }
  return { release, granules, releasePath };
}

/** Проекция из живого релиза (или подложенных путей). Ошибки — ReseedIoError/ReseedError. */
export function projectFromRelease(paths = {}) {
  const loaded = loadMatrixRelease(paths);
  return { ...loaded, grid: projectGrid({ release: loaded.release, granules: loaded.granules }) };
}

function parseArgs(argv) {
  const o = { dryRun: false, check: false, paths: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--check') o.check = true;
    else if (a === '--release' || a === '--granules' || a === '--grid') {
      const v = argv[i + 1];
      if (!v || v.startsWith('-')) throw new ReseedIoError(`${a} требует путь`);
      o.paths[a.slice(2)] = resolve(v);
      i += 1;
    } else throw new ReseedIoError(`неизвестный аргумент «${a}»`);
  }
  return o;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const gridPath = args.paths.grid ?? join(repoRoot, DEFAULT_PATHS.grid);
  const { release, grid } = projectFromRelease(args.paths);
  const text = serializeGrid(grid);
  const pins = Object.keys(release.pins).length;
  const label = `${release.releaseId}@${release.templateVersion}`;

  if (args.dryRun) {
    process.stdout.write(text);
    console.error(`tariff:reseed — dry-run: проекция ${label} (${pins} pins), файл не тронут`);
    return 0;
  }

  if (args.check) {
    if (!existsSync(gridPath)) {
      console.error(`tariff:reseed --check — сетки нет на диске: ${gridPath}; пересев: yarn tariff:reseed`);
      return 1;
    }
    const current = readJson(gridPath, 'сетка');
    const findings = releaseCrossFindings(current, grid);
    if (findings.length === 0) {
      console.log(`tariff:reseed --check — сетка совпадает с проекцией релиза ${label} (${pins} pins)`);
      return 0;
    }
    console.error(`tariff:reseed --check — расхождений сетки с релизом ${label}: ${findings.length}`);
    for (const f of findings) console.error(`  ✖ ${f.where} — ${f.reason}`);
    console.error('\nСетка — производная: править её руками нельзя, пересеять: yarn tariff:reseed');
    return 1;
  }

  const before = existsSync(gridPath) ? readFileSync(gridPath, 'utf8') : null;
  writeFileSync(gridPath, text, 'utf8');
  console.log(
    `tariff:reseed — ${before === text ? 'сетка уже совпадала' : 'сетка записана'}: ${gridPath} ← ${label} (${pins} pins, прав ${grid.registry.length})`,
  );
  return 0;
}

if (process.argv[1]?.endsWith('tariff-reseed.mjs')) {
  try {
    process.exit(main());
  } catch (e) {
    if (e instanceof ReseedIoError || e instanceof ReseedError) {
      console.error(`tariff:reseed — инструментальная ошибка: ${e.message}`);
      process.exit(2);
    }
    throw e;
  }
}
