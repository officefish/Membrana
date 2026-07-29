#!/usr/bin/env node
/**
 * yarn tariff:grid --check — зуб формы живого документа тарифной сетки
 * (S1 плана интеграции; заседание `tariff-grid`, ратифицировано 29.07).
 *
 * Проверяет НАСТОЯЩИЙ документ `docs/tariffs/tariff-grid.json`, а не выдумку
 * теста: полнота матрицы, закрытость реестра, совпадение рода, читаемость формы,
 * плюс сверку с декларацией числовых потолков (S0) — числа не должны разъезжаться
 * между двумя носителями, как разъехались сид и решение владельца 29.07.
 *
 * Правила проверки — чистые функции; здесь ФС и отчёт.
 *
 * Exit: 0 — находок нет; 1 — находки (red_ci); 2 — инструментальная ошибка.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gridFindings, scalarsCrossFindings } from './lib/tariff-grid-check.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GRID = join(repoRoot, 'docs/tariffs/tariff-grid.json');
const SCALARS = join(repoRoot, 'docs/tariffs/tariff-scalars.json');

function main() {
  const grid = JSON.parse(readFileSync(GRID, 'utf8'));
  const scalars = JSON.parse(readFileSync(SCALARS, 'utf8'));

  const findings = [...gridFindings(grid), ...scalarsCrossFindings(grid, scalars)];

  console.log(
    `tariff:grid — прав в реестре: ${grid.registry?.length ?? 0} · тарифов: ${grid.rows?.length ?? 0} · ` +
      `ячеек: ${(grid.rows ?? []).reduce((n, r) => n + Object.keys(r.cells ?? {}).length, 0)}`,
  );

  const provisional = Object.keys(grid['//provisional'] ?? {}).filter((k) => k !== '//');
  if (provisional.length > 0) {
    console.log(`  предварительных значений (ждут слова владельца): ${provisional.length}`);
    for (const key of provisional) console.log(`    · ${key}`);
  }

  if (findings.length === 0) {
    console.log('tariff:grid — форма честна: полнота, реестр и роды сходятся, числа не разъехались');
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
    console.error(`tariff:grid — инструментальная ошибка: ${e.message}`);
    process.exit(2);
  }
}
