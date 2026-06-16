/**
 * FFT «последний шанс»: калибровка порогового FFT-теста и анализатора тенденций (trends-fft)
 * на корпусе free-v1 (data/detectors-benchmark/v0.2).
 *
 * Эпик: fft-last-chance-calibration (docs/prompts/FFT_LAST_CHANCE_CALIBRATION_EPIC_PROMPT.md).
 *
 * Цель: найти конфигурацию, дающую recall дронов >= 80% при FPR на не-дронах <= 40%.
 * Дисциплина train/val: пороги/шаблоны строятся на split=train, вердикт считается на split=val.
 *
 * Использует ТОЛЬКО существующие чистые функции (эшелон 0):
 *   - @membrana/fft-analyzer-service   — FftAnalyzer.analyze, evaluateFrameVerdict, evaluateThresholdTest
 *   - @membrana/trends-detector-service — classifyTrends, SYSTEM_TEMPLATES
 *   - @membrana/template-match-detector-service — collectMetricSamples, buildTemplateFromMetricSamples, mergeCuratedDroneTemplate
 *
 * Запуск: yarn benchmark:fft-trends
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  confusionFromPairs,
  f1Score,
  formatPct,
  percentile,
  precision,
  recall,
  sortNumbers,
} from './lib/benchmark-metrics.mjs';
import { filterCuratedSamples } from './lib/manifest-labels.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const MANIFEST_PATH = join(DATASET_DIR, 'manifest.json');
const REPORT_JSON = join(DATASET_DIR, 'reports', 'fft-trends-latest.json');
const EXPORT_TEMPLATE_JSON = join(DATASET_DIR, 'fft-last-chance-best-template.json');

const FFT_ANALYZER_DIST = join(ROOT, 'packages', 'services', 'fft-analyzer', 'dist', 'index.js');
const TRENDS_DIST = join(ROOT, 'packages', 'services', 'trends-detector', 'dist', 'index.js');
const TEMPLATE_MATCH_DIST = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'template-match',
  'dist',
  'index.js',
);

const FFT_SIZE = 2048;
const THRESHOLD_SMOOTHING = 0.5;

// ============================================================
// FFT threshold test — три конфигурации (req #2)
// ============================================================
// Подбор data-driven: см. секцию «Распределения по классам» в выводе скрипта.
// Data-driven по распределениям train (drone centroid ~2960-4185 Hz, flux ~0.05-0.12, rms ~0.11-0.22).
const THRESHOLD_CONFIGS = [
  {
    id: 'A-recall-first',
    description: 'Широкий drone-бокс (высокий centroid), normal — максимум recall',
    frameCount: 5,
    intervalMs: 500,
    strictness: 'normal',
    thresholds: {
      centroid: { min: 2600, max: 4600 },
      flux: { min: 0.02, max: 0.25 },
      rms: { min: 0.05, max: 0.35 },
    },
  },
  {
    id: 'B-balanced',
    description: 'Бокс p10-p90 дрона, normal (2 из 3 метрик)',
    frameCount: 5,
    intervalMs: 500,
    strictness: 'normal',
    thresholds: {
      centroid: { min: 2900, max: 4300 },
      flux: { min: 0.03, max: 0.16 },
      rms: { min: 0.07, max: 0.28 },
    },
  },
  {
    id: 'C-precision-first',
    description: 'Узкий бокс (интерквартиль), normal — снижаем ложные ценой recall',
    frameCount: 5,
    intervalMs: 500,
    strictness: 'normal',
    thresholds: {
      centroid: { min: 3300, max: 4150 },
      flux: { min: 0.05, max: 0.13 },
      rms: { min: 0.1, max: 0.22 },
    },
  },
];

// ============================================================
// trends-fft — комбинации шаблонов (req #3)
// ============================================================
const TRENDS_MIN_CONFIDENCE_SWEEP = [30, 35, 40, 45, 50];

function pct(arr, p) {
  return percentile(sortNumbers(arr), p);
}

function summarizeMetric(values) {
  const sorted = sortNumbers(values);
  return {
    p10: pct(sorted, 10),
    p25: pct(sorted, 25),
    p50: pct(sorted, 50),
    p75: pct(sorted, 75),
    p90: pct(sorted, 90),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function fmt(n) {
  return n == null ? '—' : Number(n).toFixed(n >= 100 ? 0 : 3);
}

async function ensureBuilt(distPath, label) {
  try {
    await access(distPath);
  } catch {
    throw new Error(`${label} not built (${distPath}). Run: yarn benchmark:fft-trends`);
  }
}

/**
 * Один пороговый тест над сэмплом: frameCount кадров с шагом intervalMs.
 */
function runThresholdTest(fft, samples, sampleRate, config) {
  const { FftAnalyzer, SpectralFluxTracker, applyPreset, PRESETS, rms, evaluateFrameVerdict, evaluateThresholdTest } =
    fft;
  const analyzer = new FftAnalyzer(
    applyPreset({ ...PRESETS.drone, fftSize: FFT_SIZE, smoothingTimeConstant: THRESHOLD_SMOOTHING }),
  );
  const fluxTracker = new SpectralFluxTracker();
  const window = new Float32Array(FFT_SIZE);
  const frames = [];

  for (let i = 0; i < config.frameCount; i += 1) {
    const timestampMs = i * config.intervalMs;
    const startIdx = Math.floor((timestampMs / 1000) * sampleRate);
    let segLen = Math.min(FFT_SIZE, Math.max(0, samples.length - startIdx));
    for (let s = 0; s < FFT_SIZE; s += 1) {
      window[s] = s < segLen ? samples[startIdx + s] : 0;
    }
    const live = analyzer.analyze(window, sampleRate, timestampMs, fluxTracker);
    const metrics = { centroid: live.centroid, flux: live.flux, rms: rms(window) };
    const verdict = evaluateFrameVerdict(metrics, config.thresholds, config.strictness);
    frames.push({ ...verdict, index: i, timestamp: timestampMs });
  }

  const result = evaluateThresholdTest({
    frames,
    strictness: config.strictness,
    frameCount: config.frameCount,
    thresholds: config.thresholds,
    intervalMs: config.intervalMs,
    mode: 'auto',
    testId: 'bench',
    startedAt: 0,
    finishedAt: config.frameCount * config.intervalMs,
  });
  return result.isDetected;
}

function evalConfusion(dataset, predictFn) {
  const pairs = dataset.map((s) => ({ truthDrone: s.truthDrone, predDrone: predictFn(s) }));
  const { tp, fp, fn, tn } = confusionFromPairs(pairs);
  const prec = precision(tp, fp);
  const rec = recall(tp, fn);
  const fpr = fp + tn === 0 ? null : fp / (fp + tn);
  return { tp, fp, fn, tn, precision: prec, recall: rec, fpr, f1: f1Score(prec, rec) };
}

function meetsTarget(m) {
  return m.recall != null && m.recall >= 0.8 && m.fpr != null && m.fpr <= 0.4;
}

function printMetrics(label, m) {
  const ok = meetsTarget(m) ? ' ✅ TARGET' : '';
  console.log(
    `    ${label.padEnd(14)} recall=${formatPct(m.recall)} FPR=${formatPct(m.fpr)} ` +
      `precision=${formatPct(m.precision)} F1=${fmt(m.f1)} [TP${m.tp} FP${m.fp} FN${m.fn} TN${m.tn}]${ok}`,
  );
}

async function main() {
  await ensureBuilt(FFT_ANALYZER_DIST, '@membrana/fft-analyzer-service');
  await ensureBuilt(TRENDS_DIST, '@membrana/trends-detector-service');
  await ensureBuilt(TEMPLATE_MATCH_DIST, '@membrana/template-match-detector-service');

  const fft = await import(pathToFileURL(FFT_ANALYZER_DIST).href);
  const trends = await import(pathToFileURL(TRENDS_DIST).href);
  const tmatch = await import(pathToFileURL(TEMPLATE_MATCH_DIST).href);

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const curated = filterCuratedSamples(manifest.samples);

  console.log(`\n=== FFT Last Chance — корпус free-v1 (dataset v${manifest.version}) ===`);
  console.log(`Загружаю и декодирую ${curated.length} WAV...`);

  const all = [];
  for (const entry of curated) {
    const { samples, sampleRate } = await readWavMono(join(DATASET_DIR, entry.path));
    all.push({
      id: entry.id,
      label: entry.label,
      truthDrone: entry.label === 'drone',
      split: entry.split ?? 'train',
      samples,
      sampleRate,
    });
  }

  const train = all.filter((s) => s.split === 'train');
  const val = all.filter((s) => s.split === 'val');
  const evalSet = val.length > 0 ? val : all;
  console.log(
    `Split: train=${train.length} (drone ${train.filter((s) => s.truthDrone).length}), ` +
      `val=${val.length} (drone ${val.filter((s) => s.truthDrone).length})`,
  );

  // --- Распределения по классам (на train) для дизайна порогов ---
  const metricsByClass = { drone: { centroid: [], flux: [], rms: [] }, 'not-drone': { centroid: [], flux: [], rms: [] } };
  for (const s of train) {
    const samplesMetrics = tmatch.collectMetricSamples(s.samples, s.sampleRate, {
      fftSize: FFT_SIZE,
      intervalMs: 500,
      measurementsCount: 10,
    });
    for (const ms of samplesMetrics) {
      const bucket = metricsByClass[s.label];
      bucket.centroid.push(ms.centroid);
      bucket.flux.push(ms.flux);
      bucket.rms.push(ms.rms);
    }
  }
  console.log('\n--- Распределения метрик по классам (train, перцентили) ---');
  for (const cls of ['drone', 'not-drone']) {
    for (const metric of ['centroid', 'flux', 'rms']) {
      const d = summarizeMetric(metricsByClass[cls][metric]);
      console.log(
        `  ${cls.padEnd(9)} ${metric.padEnd(8)} p10=${fmt(d.p10)} p25=${fmt(d.p25)} p50=${fmt(d.p50)} p75=${fmt(d.p75)} p90=${fmt(d.p90)}`,
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    datasetVersion: `v${manifest.version}`,
    counts: { train: train.length, val: val.length, total: all.length },
    target: { droneRecall: 0.8, notDroneFpr: 0.4 },
    distributions: {
      drone: {
        centroid: summarizeMetric(metricsByClass.drone.centroid),
        flux: summarizeMetric(metricsByClass.drone.flux),
        rms: summarizeMetric(metricsByClass.drone.rms),
      },
      'not-drone': {
        centroid: summarizeMetric(metricsByClass['not-drone'].centroid),
        flux: summarizeMetric(metricsByClass['not-drone'].flux),
        rms: summarizeMetric(metricsByClass['not-drone'].rms),
      },
    },
    thresholdAttempts: [],
    trendsAttempts: [],
  };

  // ============================================================
  // FFT threshold test — 3 конфигурации
  // ============================================================
  console.log('\n=== FFT пороговый тест (req #2) ===');
  for (const config of THRESHOLD_CONFIGS) {
    console.log(`\n  [${config.id}] ${config.description}`);
    console.log(
      `    strictness=${config.strictness} frames=${config.frameCount}@${config.intervalMs}ms ` +
        `centroid[${config.thresholds.centroid.min},${config.thresholds.centroid.max}] ` +
        `flux[${config.thresholds.flux.min},${config.thresholds.flux.max}] ` +
        `rms[${config.thresholds.rms.min},${config.thresholds.rms.max}]`,
    );
    const predict = (s) => runThresholdTest(fft, s.samples, s.sampleRate, config);
    const trainM = evalConfusion(train, predict);
    const valM = evalConfusion(evalSet, predict);
    printMetrics('train', trainM);
    printMetrics('val', valM);
    report.thresholdAttempts.push({ config, train: trainM, val: valM });
  }

  // ============================================================
  // trends-fft — построение DRONE_* шаблонов + комбинации
  // ============================================================
  console.log('\n=== Анализатор тенденций FFT (req #3) ===');
  const trainDrones = train.filter((s) => s.truthDrone);
  const perSampleTemplates = trainDrones.map((s, i) => {
    const ms = tmatch.collectMetricSamples(s.samples, s.sampleRate, {
      fftSize: FFT_SIZE,
      intervalMs: 500,
      measurementsCount: 10,
    });
    return tmatch.buildTemplateFromMetricSamples(ms, `DRONE_TRAIN_${i}`, `Drone train ${i}`);
  });
  const mergedDrone = tmatch.mergeCuratedDroneTemplate(perSampleTemplates, 'DRONE_CURATED');
  const nonDroneSystem = trends.SYSTEM_TEMPLATES.filter((t) => !t.key.startsWith('DRONE'));
  // Тесный «бокс» из перцентилей дрона (стабильность + высокий centroid) — узкая альтернатива merged-union.
  const tightDrone = {
    key: 'DRONE_TIGHT',
    name: 'Дрон (tight p10-p90)',
    icon: '🛸',
    color: '#ff6b6b',
    description: 'Узкий шаблон из перцентилей train-дронов (стабильный высокочастотный гул)',
    thresholds: {
      centroid: { min: 2900, max: 4300 },
      flux: { min: 0.03, max: 0.16 },
      rms: { min: 0.07, max: 0.28 },
      frameHitRatio: { min: 0.6, max: 1.0 },
    },
    temporalPatterns: {
      activityRatio: { min: 0.8, max: 1.0 },
      centroidStd: { min: 0, max: 400 },
      longTermStability: ['high', 'veryHigh'],
      volumeTrend: ['stable'],
      frequencyTrend: ['stable'],
    },
  };
  // Берём 3 репрезентативных пер-сэмпл шаблона (каждый ~ четверть корпуса) для combo3.
  const subtypeTemplates = [
    perSampleTemplates[Math.floor(perSampleTemplates.length * 0.15)],
    perSampleTemplates[Math.floor(perSampleTemplates.length * 0.5)],
    perSampleTemplates[Math.floor(perSampleTemplates.length * 0.85)],
  ].filter(Boolean);

  const TRENDS_COMBOS = [
    {
      id: '1-tight+competitors',
      description: 'Узкий DRONE_TIGHT + системные не-дрон шаблоны',
      templates: [tightDrone, ...nonDroneSystem],
    },
    {
      id: '2-merged+competitors',
      description: 'Объединённый DRONE_CURATED + системные не-дрон шаблоны (для сравнения)',
      templates: [mergedDrone, ...nonDroneSystem],
    },
    {
      id: '3-tight+subtypes+competitors',
      description: 'DRONE_TIGHT + 3 пер-сэмпл подтипа + системные не-дрон шаблоны',
      templates: [tightDrone, ...subtypeTemplates, ...nonDroneSystem],
    },
  ];

  // Кешируем метрические серии (одинаковы для всех комбо/порогов).
  const metricSeries = new Map();
  for (const s of all) {
    metricSeries.set(
      s.id,
      tmatch.collectMetricSamples(s.samples, s.sampleRate, {
        fftSize: FFT_SIZE,
        intervalMs: 500,
        measurementsCount: 10,
      }),
    );
  }

  let bestTrends = null;
  for (const combo of TRENDS_COMBOS) {
    console.log(`\n  [${combo.id}] ${combo.description} (templates=${combo.templates.length})`);
    for (const minConfidence of TRENDS_MIN_CONFIDENCE_SWEEP) {
      const predict = (s) => {
        const series = metricSeries.get(s.id);
        if (!series || series.length === 0) return false;
        const res = trends.classifyTrends(series, combo.templates, {
          minConfidence,
          activityRmsThreshold: 0.02,
        });
        return res.isDetected && res.detectedState.startsWith('DRONE');
      };
      const trainM = evalConfusion(train, predict);
      const valM = evalConfusion(evalSet, predict);
      printMetrics(`minC=${minConfidence} train`, trainM);
      printMetrics(`minC=${minConfidence} val`, valM);
      report.trendsAttempts.push({ combo: combo.id, minConfidence, train: trainM, val: valM });
      if (meetsTarget(valM)) {
        const score = valM.recall - valM.fpr;
        if (!bestTrends || score > bestTrends.score) {
          bestTrends = { combo, minConfidence, score, templates: combo.templates };
        }
      }
    }
  }

  // --- Экспорт лучшего шаблона как user-шаблон для UI (req #3 «создал для себя») ---
  const exportTemplate = {
    version: 1,
    note: 'Лучший DRONE-шаблон из FFT-last-chance калибровки. Импорт в trends-fft как user-шаблон.',
    drone: tightDrone,
    droneMerged: mergedDrone,
    bestConfig: bestTrends
      ? { combo: bestTrends.combo.id, minConfidence: bestTrends.minConfidence }
      : null,
  };
  await writeFile(EXPORT_TEMPLATE_JSON, `${JSON.stringify(exportTemplate, null, 2)}\n`, 'utf8');
  console.log(`\nЭкспортирован шаблон-кандидат: ${EXPORT_TEMPLATE_JSON}`);

  // --- Сводка ---
  console.log('\n=== Сводка (вердикт на val) ===');
  const passedThreshold = report.thresholdAttempts.filter((a) => meetsTarget(a.val));
  const passedTrends = report.trendsAttempts.filter((a) => meetsTarget(a.val));
  console.log(`  FFT пороговый тест: ${passedThreshold.length}/${report.thresholdAttempts.length} конфигов достигли цели`);
  console.log(`  trends-fft: ${passedTrends.length}/${report.trendsAttempts.length} комбинаций достигли цели`);
  report.verdict = {
    thresholdMeetsTarget: passedThreshold.length > 0,
    trendsMeetsTarget: passedTrends.length > 0,
    bestThreshold: bestByScore(report.thresholdAttempts),
    bestTrends: bestByScore(report.trendsAttempts),
  };

  await mkdir(dirname(REPORT_JSON), { recursive: true });
  await writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${REPORT_JSON}`);
}

function bestByScore(attempts) {
  let best = null;
  for (const a of attempts) {
    const m = a.val;
    if (m.recall == null || m.fpr == null) continue;
    const score = m.recall - m.fpr;
    if (!best || score > best.score) {
      best = { score, recall: m.recall, fpr: m.fpr, precision: m.precision, f1: m.f1, ref: a.config?.id ?? `${a.combo}@minC${a.minConfidence}` };
    }
  }
  return best;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
