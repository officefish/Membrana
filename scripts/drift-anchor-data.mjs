#!/usr/bin/env node
/**
 * Drift-Anchor — data-anchor producer (DA4, консилиум drift-anchor-triggers #404).
 *
 * ЧЕСТНАЯ ФОРМУЛИРОВКА (решение владельца 2026-07-13): изначальный замысел консилиума —
 * «замороженный детектор + свежий поток реальных полевых записей» — потребовал бы гонять
 * детекторы по настоящим пользовательским аудиозаписям. Владелец выбрал БЕЗОПАСНЫЙ вариант:
 * входные данные — ТОЛЬКО системный курируемый `__tariff_dataset__` (тот же корпус free-v1,
 * что и code-anchor, 120 сэмплов), никаких реальных записей пользователей не читается и не
 * анализируется. Это НЕ детектирует настоящий акустический дрейф поля — это проверка
 * ЦЕЛОСТНОСТИ ПРОВИЖИНИНГА: совпадают ли метрики на копии корпуса, которую background-media
 * реально отдаёт устройствам, с каноническим baseline (порча blob-хранилища, рассинхрон
 * каталога, случайная правка меток через PATCH — вот что этот якорь ловит).
 *
 * Источник данных: `__tariff_dataset__` служебного canary-устройства на background-media
 * (docs/anchors/data-anchor-canary-device.json) — НЕ настоящий пользователь, зарегистрирован
 * специально для этого якоря. Детекторы — ТЕ ЖЕ 5, что в code-anchor (не заморожены как
 * отдельный образ: imageFrozenAt=null, честно — образ не замораживается, это осознанное
 * упрощение, зафиксированное вместе с выбором безопасного источника данных).
 *
 * Usage: node scripts/drift-anchor-data.mjs [--records-dir <dir>]
 * Env: MEDIA_API_URL (default https://media.membrana.space), MEDIA_API_TOKEN (required)
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DSP_DETECTORS, runDetector, runTemplateMatch, runYamnet } from './benchmark-detectors.mjs';
import { fetchTariffDatasetSamples } from './lib/media-samples-client.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'docs/anchors/corpus-baseline.json');
const THRESHOLDS_PATH = join(ROOT, 'docs/anchors/thresholds.json');
const CANARY_DEVICE_PATH = join(ROOT, 'docs/anchors/data-anchor-canary-device.json');
const RECORDS_DIR = join(ROOT, 'docs/reports/drift-anchor/records');
const CORE_DIST = join(ROOT, 'packages/core/dist/index.js');

const DEFAULT_MEDIA_API_URL = 'https://media.membrana.space';

/** JSON с допуском BOM (см. drift-anchor-code.mjs — тот же паттерн). */
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
}

/** Та же версия детекторного кода, что и code-anchor (drift-anchor-code.mjs). */
function detectorVersion() {
  const paths = [
    'packages/services/detectors',
    'packages/services/detection-ensemble-service',
    'data/detectors-benchmark/v0.2/manifest.json',
  ];
  return execFileSync('git', ['log', '-1', '--format=%H', '--', ...paths], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

export function parseArgs(argv) {
  const options = { recordsDir: RECORDS_DIR };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--records-dir' && argv[i + 1]) {
      options.recordsDir = resolve(argv[++i]);
    }
  }
  return options;
}

/** Прогнать те же 5 детекторов, что code-anchor, на скачанном во временный каталог наборе. */
async function runAllDetectors(manifestSamples, datasetDir) {
  const results = {};
  for (const spec of DSP_DETECTORS) {
    const r = await runDetector(manifestSamples, spec, datasetDir);
    results[r.name] = r.metrics.f1;
  }
  const template = await runTemplateMatch(manifestSamples, datasetDir);
  results[template.name] = template.metrics.f1;
  const yamnet = await runYamnet(manifestSamples, datasetDir);
  results[yamnet.name] = yamnet.metrics.f1;
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const mediaUrl = (process.env.MEDIA_API_URL ?? DEFAULT_MEDIA_API_URL).replace(/\/$/, '');
  const mediaToken = process.env.MEDIA_API_TOKEN?.trim();
  if (!mediaToken) {
    throw new Error('MEDIA_API_TOKEN обязателен (см. /etc/membrana/office.env на хосте раннера)');
  }
  const canary = readJson(CANARY_DEVICE_PATH);

  const tempDir = mkdtempSync(join(tmpdir(), 'drift-anchor-data-'));
  let currentF1;
  let fetched;
  try {
    fetched = await fetchTariffDatasetSamples({
      baseUrl: mediaUrl,
      token: mediaToken,
      deviceId: canary.deviceId,
      destDir: tempDir,
    });
    if (fetched.manifestSamples.length === 0) {
      throw new Error(
        `__tariff_dataset__ пуст на canary-устройстве ${canary.deviceId} — провижининг сломан или не запущен`,
      );
    }
    currentF1 = await runAllDetectors(fetched.manifestSamples, tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  const baseline = readJson(BASELINE_PATH);
  const thresholds = readJson(THRESHOLDS_PATH);
  const epsilon = thresholds.dataAnchorEpsilonF1;
  if (typeof epsilon !== 'number') {
    throw new Error('dataAnchorEpsilonF1 отсутствует в docs/anchors/thresholds.json');
  }

  const { buildAnchorRecord } = await import(pathToFileURL(CORE_DIST).href);
  const record = buildAnchorRecord(baseline.f1, currentF1, epsilon, {
    anchorKind: 'data',
    anchorSource: 'schedule',
    detectorVersion: detectorVersion(),
    takenAt: new Date().toISOString(),
    imageFrozenAt: null, // честно: образ не заморожен, см. докстринг файла
  });

  const day = record.takenAt.slice(0, 10);
  mkdirSync(options.recordsDir, { recursive: true });
  const payload = JSON.stringify(record, null, 2) + '\n';
  writeFileSync(join(options.recordsDir, `data-schedule-${day}.json`), payload, 'utf8');
  writeFileSync(join(options.recordsDir, 'data-schedule-latest.json'), payload, 'utf8');

  console.log(
    `data-anchor(schedule): verdict=${record.verdict} delta=${record.delta} ε=${epsilon} samples=${fetched.manifestSamples.length}/${fetched.totalListed} canary=${canary.deviceId.slice(0, 8)}`,
  );
  for (const [name, f1] of Object.entries(record.metrics)) {
    const base = baseline.f1[name];
    console.log(`  ${name}: F1=${f1}${base === undefined ? ' (новый)' : ` (baseline ${base})`}`);
  }
  console.error(`record → ${join(options.recordsDir, `data-schedule-${day}.json`)}`);

  if (record.verdict !== 'ok') {
    console.error(
      `${record.verdict.toUpperCase()}: провизионированный __tariff_dataset__ на media разошёлся с git-корпусом (warning — ничего не блокирует).`,
    );
  }
  // data-anchor всегда мягкий (warning) — консилиум #404: не блокирует деплой ни при каком verdict.
  process.exit(0);
}

if (process.argv[1]?.endsWith('drift-anchor-data.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
