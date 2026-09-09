#!/usr/bin/env node
/**
 * yarn tariff:cutover — готова ли сетка как единственный источник истины
 * (#2333; заседание `tariff-grid`, ратифицировано 29.07).
 *
 * Печатает вердикт по каждой опоре плана и говорит прямо: можно публиковать
 * сетку или нет. Публикация при неготовности запрещена — права поехали бы на
 * непроверенном носителе.
 *
 * Exit: 0 — готово; 1 — не готово (перечень блокеров).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import {
  CUTOVER_REQUIREMENTS,
  CUTOVER_TEETH,
  cutoverReadiness,
  mayPublishGridTruth,
  rollbackPlan,
} from './lib/tariff-cutover.mjs';

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

function commandClean(args) {
  try {
    execFileSync(process.execPath, args, {
      cwd: repoRoot,
      stdio: 'pipe',
      timeout: 120_000,
    });
    return true;
  } catch {
    return false;
  }
}

function singleTruthClean() {
  const retiredEnvKey = ['TARIFF', 'GRID', 'MODE'].join('_');
  const roots = [join(repoRoot, 'packages'), join(repoRoot, 'scripts')];
  const stack = [...roots];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];
    } catch {
      return false;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'generated') continue;
        stack.push(full);
        continue;
      }
      if (!/\.(ts|tsx|mjs|js|json)$/u.test(entry.name)) continue;
      const text = readText(full);
      if (text.includes(retiredEnvKey)) return false;
    }
  }
  return true;
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function main() {
  const teeth = {
    gridClean: gridToothClean(),
    cabinetProjectionClean: commandClean([
      '--test',
      'scripts/tariff-project-cabinet.test.mjs',
      'scripts/tariff-grid-check.test.mjs',
      'scripts/tariff-scalars.test.mjs',
      'packages/background-cabinet/prisma/seed.test.mjs',
    ]),
    deviceProjectionClean: commandClean([
      '--test',
      'scripts/tariff-devices-check.test.mjs',
      'scripts/tariff-devices-fanout.test.mjs',
    ]),
    singleTruthClean: singleTruthClean(),
  };
  const readiness = cutoverReadiness((p) => existsSync(join(repoRoot, p)), teeth);

  console.log('tariff:cutover — готовность сетки как единственного источника истины\n');
  for (const r of CUTOVER_REQUIREMENTS) {
    const ok = existsSync(join(repoRoot, r.carrier));
    console.log(`  ${ok ? '✓' : '✖'} ${r.id.padEnd(14)} ${r.title}`);
  }
  for (const tooth of CUTOVER_TEETH) {
    console.log(`  ${teeth[tooth.id] ? '✓' : '✖'} ${tooth.id.padEnd(22)} ${tooth.title}`);
  }

  if (mayPublishGridTruth(readiness)) {
    console.log('\nГОТОВО: сетка законна как единственный источник истины');
    console.log(`Откат: ${rollbackPlan().note}`);
    return 0;
  }

  console.error(`\nНЕ ГОТОВО — блокеров: ${readiness.blockers.length}`);
  for (const b of readiness.blockers) console.error(`  ✖ [${b.toothId}] ${b.where} — ${b.reason}`);
  console.error('\nПубликовать сетку при неготовности запрещено (вердикт M8).');
  return 1;
}

if (process.argv[1]?.endsWith('tariff-cutover-check.mjs')) process.exit(main());
