#!/usr/bin/env node
/**
 * yarn tariff:cutover — готово ли переключение сетки на роль источника истины
 * (S9 плана интеграции; заседание `tariff-grid`, ратифицировано 29.07).
 *
 * Печатает вердикт по каждой опоре плана и говорит прямо: можно включать режим
 * сетки или нет. Включение при неготовности запрещено — права поехали бы на
 * непроверенном носителе.
 *
 * Exit: 0 — готово; 1 — не готово (перечень блокеров).
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { CUTOVER_REQUIREMENTS, cutoverReadiness, mayEnableGridMode, rollbackPlan } from './lib/tariff-cutover.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function gridToothClean() {
  try {
    execFileSync(process.execPath, [join(repoRoot, 'scripts/tariff-grid-validate.mjs')], {
      cwd: repoRoot,
      stdio: 'pipe',
      timeout: 60_000,
    });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const teeth = { gridClean: gridToothClean() };
  const readiness = cutoverReadiness((p) => existsSync(join(repoRoot, p)), teeth);

  console.log('tariff:cutover — готовность переключения сетки на источник истины\n');
  for (const r of CUTOVER_REQUIREMENTS) {
    const ok = existsSync(join(repoRoot, r.carrier));
    console.log(`  ${ok ? '✓' : '✖'} ${r.id.padEnd(14)} ${r.title}`);
  }
  console.log(`  ${teeth.gridClean ? '✓' : '✖'} ${'teeth'.padEnd(14)} зубы сетки зелёные`);

  if (mayEnableGridMode(readiness)) {
    console.log('\nГОТОВО: включение режима сетки законно — TARIFF_GRID_MODE=1');
    console.log(`Откат: ${rollbackPlan().note}`);
    return 0;
  }

  console.error(`\nНЕ ГОТОВО — блокеров: ${readiness.blockers.length}`);
  for (const b of readiness.blockers) console.error(`  ✖ [${b.toothId}] ${b.where} — ${b.reason}`);
  console.error('\nВключать режим сетки при неготовности запрещено (вердикт M8).');
  return 1;
}

if (process.argv[1]?.endsWith('tariff-cutover-check.mjs')) process.exit(main());
