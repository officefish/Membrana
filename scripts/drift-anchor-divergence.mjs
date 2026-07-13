#!/usr/bin/env node
/**
 * Drift-Anchor — алерт «Прод ≠ main» (DA5, консилиум drift-anchor-triggers #404).
 *
 * Сверяет последнюю CI-запись code-anchor с последней scheduled-записью чистой
 * `evaluateProdMainDivergence` (@membrana/core): одна detectorVersion, но метрики
 * корпуса разошлись > ε → danger-алерт (иконка + текст, не только цвет — UI-строку
 * рисует Rodchenko по этому же вердикту).
 *
 * Graceful: нет пары записей (CI ещё не бегал / schedule ещё не бегал) → exit 0
 * с честным «пары нет» — отсутствие данных не алерт.
 *
 * Usage: node scripts/drift-anchor-divergence.mjs [--records-dir <dir>]
 * Exit: 0 in-sync / stale-ci / нет пары; 2 diverged («Прод ≠ main»).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RECORDS_DIR = join(ROOT, 'docs/reports/drift-anchor/records');
const THRESHOLDS_PATH = join(ROOT, 'docs/anchors/thresholds.json');
const CORE_DIST = join(ROOT, 'packages/core/dist/index.js');

export function parseArgs(argv) {
  const options = { recordsDir: RECORDS_DIR };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--records-dir' && argv[i + 1]) {
      options.recordsDir = resolve(argv[++i]);
    }
  }
  return options;
}

/** Маппинг вердикта сверки в exit-код: только diverged алертит. */
export function exitCodeFor(verdict) {
  return verdict === 'diverged' ? 2 : 0;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ciPath = join(options.recordsDir, 'code-ci-latest.json');
  const schedulePath = join(options.recordsDir, 'code-schedule-latest.json');

  const missing = [ciPath, schedulePath].filter((p) => !existsSync(p));
  if (missing.length > 0) {
    console.log(`пары записей нет (${missing.length}/2 отсутствует) — сверка «Прод ≠ main» пропущена`);
    for (const p of missing) console.log(`  нет: ${p}`);
    return;
  }

  const thresholds = readJson(THRESHOLDS_PATH);
  const epsilon = thresholds.prodMainEpsilonF1;
  if (typeof epsilon !== 'number') {
    throw new Error('prodMainEpsilonF1 отсутствует в docs/anchors/thresholds.json');
  }

  const { evaluateProdMainDivergence } = await import(pathToFileURL(CORE_DIST).href);
  const result = evaluateProdMainDivergence(readJson(ciPath), readJson(schedulePath), epsilon);

  console.log(
    `prod↔main: verdict=${result.verdict} delta=${result.delta} ci=${result.ciDetectorVersion.slice(0, 12)} schedule=${result.scheduleDetectorVersion.slice(0, 12)}`,
  );
  for (const reason of result.reasons) console.log(`  ${reason}`);
  if (result.verdict === 'diverged') {
    console.error('⛔ ПРОД ≠ MAIN: одна версия детекторного кода даёт разные метрики корпуса — danger-алерт (#404).');
  }
  process.exit(exitCodeFor(result.verdict));
}

if (process.argv[1]?.endsWith('drift-anchor-divergence.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
