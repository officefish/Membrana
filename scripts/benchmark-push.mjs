#!/usr/bin/env node
/**
 * benchmark-push (#454): дистиллировать канонический прогон
 * data/detectors-benchmark/v0.2/reports/latest.json в агрегатную сводку
 * (БЕЗ perSample — data-минимизация Q3) и PUSH'нуть в office
 * (`POST /v1/benchmark/report`) для панельного борда detector-compare.
 *
 * Usage:
 *   yarn benchmark:push              # дистилляция + POST
 *   yarn benchmark:push --dry-run    # показать сводку, не отправлять
 *
 * НЕ graceful (команда интерактивная/деплойная): ошибки → exit 1.
 * Канонический прогон НЕ перезапускается — скрипт только читает отчёт.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = 'data/detectors-benchmark/v0.2/reports/latest.json';

/** Числовые метрики-агрегаты; всё пер-сэмпловое отбрасывается. */
const METRIC_KEYS = [
  'tp',
  'fp',
  'fn',
  'tn',
  'precision',
  'recall',
  'f1',
  'latencyP50Ms',
  'latencyP95Ms',
];

export function distillBenchmarkSummary(raw) {
  const detectors = (raw.detectors ?? []).map((d) => {
    const entry = { name: d.name, family: d.family, status: d.status };
    if (d.metrics && typeof d.metrics === 'object') {
      const metrics = {};
      for (const key of METRIC_KEYS) {
        if (typeof d.metrics[key] === 'number' && Number.isFinite(d.metrics[key])) {
          metrics[key] = d.metrics[key];
        }
      }
      if (Object.keys(metrics).length > 0) entry.metrics = metrics;
    }
    return entry;
  });
  return {
    generatedAt: raw.generatedAt,
    datasetVersion: raw.datasetVersion,
    sampleCount: raw.sampleCount,
    detectors,
  };
}

const isMain = process.argv[1]?.endsWith('benchmark-push.mjs');
if (isMain) {
  const dryRun = process.argv.includes('--dry-run');

  let raw;
  try {
    raw = JSON.parse(readFileSync(join(repoRoot, REPORT_PATH), 'utf8'));
  } catch (err) {
    console.error(`Не читается ${REPORT_PATH}: ${err?.message ?? err}`);
    process.exit(1);
  }
  const summary = distillBenchmarkSummary(raw);
  if (!summary.generatedAt || !summary.datasetVersion || summary.detectors.length === 0) {
    console.error('Отчёт неполный: нужны generatedAt/datasetVersion/detectors.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  loadDotEnv();
  const token = process.env.OFFICE_API_TOKEN?.trim() || process.env.API_INTERNAL_TOKEN?.trim();
  if (!token) {
    console.error('Нет OFFICE_API_TOKEN/API_INTERNAL_TOKEN в .env/окружении.');
    process.exit(1);
  }
  const base = (process.env.OFFICE_BASE_URL?.trim() || 'https://office.mmbrn.tech').replace(/\/+$/, '');

  try {
    const res = await fetch(`${base}/v1/benchmark/report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-membrana-token': token },
      body: JSON.stringify(summary),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`office ответил ${res.status}: ${await res.text().catch(() => '')}`);
      process.exit(1);
    }
    console.log(
      `[benchmark-push] сводка принята office: прогон ${summary.generatedAt}, корпус ${summary.datasetVersion}, детекторов ${summary.detectors.length}`,
    );
  } catch (err) {
    console.error(`office недоступен: ${err?.message ?? err}`);
    process.exit(1);
  }
}
