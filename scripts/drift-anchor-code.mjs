#!/usr/bin/env node
/**
 * Drift-Anchor — code-anchor producer (DA4, консилиум drift-anchor-triggers #404).
 *
 * Прогоняет эталонный корпус free-v1 (через benchmark-detectors --report в сторону,
 * канонический DETECTOR_BENCHMARK.md не трогается) и сравнивает F1 детекторов с
 * `docs/anchors/corpus-baseline.json` чистой `buildCodeAnchorRecord` (@membrana/core).
 * Пишет `DriftAnchorRecord` в журнал `docs/reports/drift-anchor/records/`.
 *
 * Два режима (--source):
 *  - `ci`       — CI-гейт PR в detectors/* (жёсткий: broken → exit 2 → блок merge);
 *  - `schedule` — scheduled-code-anchor: серверный джоб, пересборка из main раз в сутки,
 *                 ловит «Прод ≠ main» (сверка ci↔schedule — evaluateProdMainDivergence).
 *
 * Usage: node scripts/drift-anchor-code.mjs [--source ci|schedule] [--report <json>] [--records-dir <dir>]
 *   --report — готовый отчёт benchmark-detectors; без него скрипт запускает прогон сам
 *              (детекторы должны быть собраны: yarn benchmark:detectors / turbo build).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'docs/anchors/corpus-baseline.json');
const THRESHOLDS_PATH = join(ROOT, 'docs/anchors/thresholds.json');
const RECORDS_DIR = join(ROOT, 'docs/reports/drift-anchor/records');
const CORE_DIST = join(ROOT, 'packages/core/dist/index.js');

/** Пути, чей последний коммит = версия детекторного кода (detectorVersion записи). */
export const DETECTOR_VERSION_PATHS = [
  'packages/services/detectors',
  'packages/services/detection-ensemble-service',
  'data/detectors-benchmark/v0.2/manifest.json',
];

/** Чистое извлечение per-detector F1 из отчёта benchmark-detectors (только benchmarked). */
export function extractCorpusF1(report) {
  const f1 = {};
  for (const d of report.detectors ?? []) {
    if (d.status === 'benchmarked' && typeof d.metrics?.f1 === 'number') {
      f1[d.name] = d.metrics.f1;
    }
  }
  return f1;
}

/** Имена файлов журнала: датированная запись + latest на источник. */
export function recordFileNames(source, takenAt) {
  const day = takenAt.slice(0, 10);
  return {
    dated: `code-${source}-${day}.json`,
    latest: `code-${source}-latest.json`,
  };
}

export function parseArgs(argv) {
  const options = { source: 'ci', reportPath: null, recordsDir: RECORDS_DIR };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i + 1]) {
      options.source = argv[++i];
    } else if (argv[i] === '--report' && argv[i + 1]) {
      options.reportPath = resolve(argv[++i]);
    } else if (argv[i] === '--records-dir' && argv[i + 1]) {
      options.recordsDir = resolve(argv[++i]);
    }
  }
  if (options.source !== 'ci' && options.source !== 'schedule') {
    throw new Error(`--source должен быть ci|schedule, получено: ${options.source}`);
  }
  return options;
}

/** JSON с допуском BOM (отчёт может прийти из PowerShell-тулинга). */
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
}

/** Reused by drift-anchor-data.mjs — оба producer'а должны определять версию одинаково. */
export function detectorVersion() {
  return execFileSync(
    'git',
    ['log', '-1', '--format=%H', '--', ...DETECTOR_VERSION_PATHS],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();
}

function runBenchmark(reportPath) {
  const res = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/benchmark-detectors.mjs'), '--report', reportPath],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (res.status !== 0) {
    throw new Error(`benchmark-detectors завершился с кодом ${res.status}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  let reportPath = options.reportPath;
  if (!reportPath) {
    reportPath = join(tmpdir(), `drift-code-report-${process.pid}.json`);
    runBenchmark(reportPath);
  }
  const report = readJson(reportPath);
  const currentF1 = extractCorpusF1(report);

  const baseline = readJson(BASELINE_PATH);
  const thresholds = readJson(THRESHOLDS_PATH);
  const epsilon = thresholds.codeAnchorEpsilonF1;
  if (typeof epsilon !== 'number') {
    throw new Error('codeAnchorEpsilonF1 отсутствует в docs/anchors/thresholds.json');
  }

  const { buildAnchorRecord } = await import(pathToFileURL(CORE_DIST).href);
  const record = buildAnchorRecord(baseline.f1, currentF1, epsilon, {
    anchorKind: 'code',
    anchorSource: options.source,
    detectorVersion: detectorVersion(),
    takenAt: new Date().toISOString(),
  });

  const names = recordFileNames(options.source, record.takenAt);
  mkdirSync(options.recordsDir, { recursive: true });
  const payload = JSON.stringify(record, null, 2) + '\n';
  writeFileSync(join(options.recordsDir, names.dated), payload, 'utf8');
  writeFileSync(join(options.recordsDir, names.latest), payload, 'utf8');

  console.log(
    `code-anchor(${options.source}): verdict=${record.verdict} delta=${record.delta} ε=${epsilon} detectorVersion=${record.detectorVersion.slice(0, 12)}`,
  );
  for (const [name, f1] of Object.entries(record.metrics)) {
    const base = baseline.f1[name];
    const mark = base === undefined ? ' (новый, вне baseline)' : ` (baseline ${base})`;
    console.log(`  ${name}: F1=${f1}${mark}`);
  }
  console.error(`record → ${join(options.recordsDir, names.dated)}`);

  if (record.verdict === 'broken') {
    console.error(`BROKEN: регресс F1 > ε=${epsilon} (или детектор исчез) — блок merge (#404).`);
    process.exit(2);
  }
  if (record.verdict === 'drift') {
    console.error(`DRIFT: регресс в пределах ε=${epsilon} — не блокирует, но виден в журнале.`);
  }
}

if (process.argv[1]?.endsWith('drift-anchor-code.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
