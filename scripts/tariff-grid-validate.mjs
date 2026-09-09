#!/usr/bin/env node
/**
 * yarn tariff:grid — зуб тарифной сетки (S1 плана интеграции; заседание `tariff-grid`
 * 29.07; перенастроен консилиумом tariff-matrix-scalars-fate-2026-09-08, спринт #2331 b4).
 *
 * Предмет: НАСТОЯЩИЙ документ `docs/tariffs/tariff-grid.json` — производная релиза матрицы
 * (docs/containers/strategic-docs/releases/tariff-matrix/). Порядок:
 *   1. форма (gridFindings) и шапка скаляров (scalarsHeaderFindings) — красный;
 *   2. G ↔ R (releaseCrossFindings): сетка ≠ проекция релиза — красный; релиза нет —
 *      инструментальная ошибка (exit 2), НЕ зелёный;
 *   3. S ↔ R (seedEpochDriftReport): расхождение сида (эпоха S0) с релизом печатается
 *      обязательным списком в основной stdout и на код возврата НЕ влияет — пересев базы
 *      это задание В. Ручная правка базы/скаляров — не предмет этого зуба.
 *
 * Правила проверки — чистые функции; здесь ФС и отчёт.
 *   --release <path> · --granules <dir> · --grid <path> · --scalars <path>  (фикстуры и тесты)
 * Exit: 0 — находок нет; 1 — находки (red_ci); 2 — инструментальная ошибка.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  gridFindings,
  releaseCrossFindings,
  scalarsHeaderFindings,
  seedEpochDriftReport,
} from './lib/tariff-grid-check.mjs';
import { ReseedError } from './lib/tariff-matrix/reseed.mjs';
import { projectFromRelease, ReseedIoError } from './tariff-reseed.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GRID = join(repoRoot, 'docs/tariffs/tariff-grid.json');
const SCALARS = join(repoRoot, 'docs/tariffs/tariff-scalars.json');

const fmt = (v) => (v == null ? 'null' : typeof v === 'string' ? `«${v}»` : String(v));

function parseArgs(argv) {
  const paths = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--release' || a === '--granules' || a === '--grid' || a === '--scalars') {
      const v = argv[i + 1];
      if (!v || v.startsWith('-')) throw new Error(`${a} требует путь`);
      paths[a.slice(2)] = resolve(v);
      i += 1;
    } else throw new Error(`неизвестный аргумент «${a}»`);
  }
  return paths;
}

function main(argv = process.argv.slice(2)) {
  const paths = parseArgs(argv);
  const grid = JSON.parse(readFileSync(paths.grid ?? GRID, 'utf8'));
  const scalars = JSON.parse(readFileSync(paths.scalars ?? SCALARS, 'utf8'));

  console.log(
    `tariff:grid — прав в реестре: ${grid.registry?.length ?? 0} · тарифов: ${grid.rows?.length ?? 0} · ` +
      `ячеек: ${(grid.rows ?? []).reduce((n, r) => n + Object.keys(r.cells ?? {}).length, 0)}`,
  );

  const provisional = Object.keys(grid['//provisional'] ?? {}).filter((k) => k !== '//');
  if (provisional.length > 0) {
    console.log(`  предварительных значений (ждут слова владельца): ${provisional.length}`);
    for (const key of provisional) console.log(`    · ${key}`);
  }

  // 1. форма
  const findings = [...gridFindings(grid), ...scalarsHeaderFindings(scalars)];

  // 2. G ↔ R — единственный красный предмет чисел; релиза нет → инструментальная ошибка
  const { release, grid: projection } = projectFromRelease(paths);
  const label = `${release.releaseId}@${release.templateVersion}`;
  findings.push(...releaseCrossFindings(grid, projection));

  // 3. S ↔ R — обязательная печать, не красный
  const drift = seedEpochDriftReport(grid, scalars);
  console.log(
    `\nseed-epoch drift (не красный, пересев — задание В): расхождений S0 ↔ релиз ${label}: ${drift.length}`,
  );
  for (const d of drift) console.log(`  · ${d.path}: сид S=${fmt(d.S)}, релиз R=${fmt(d.R)} [${d.unit}]`);
  if (drift.length === 0) {
    console.log('  · сид совпадает с релизом — это факт, не гарантия (S — эпоха сида, не SSOT)');
  }

  if (findings.length === 0) {
    console.log(`\ntariff:grid — сетка совпадает с релизом ${label}; форма честна`);
    return 0;
  }

  console.error(`\ntariff:grid — находок: ${findings.length}`);
  for (const f of findings) console.error(`  ✖ [${f.toothId}] ${f.where} — ${f.reason}`);
  console.error('\nМолчаливый зелёный запрещён: каждая находка названа зубом и адресом.');
  return 1;
}

if (process.argv[1]?.endsWith('tariff-grid-validate.mjs')) {
  try {
    process.exit(main());
  } catch (e) {
    // Релиза нет / гранула не читается — не «находка» и не зелёный: инструментальный exit 2.
    const kind = e instanceof ReseedIoError || e instanceof ReseedError ? 'релиз матрицы' : 'инструментальная ошибка';
    console.error(`tariff:grid — ${kind}: ${e.message}`);
    process.exit(2);
  }
}
