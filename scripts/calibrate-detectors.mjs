/**
 * Grid-search sample-level confidence threshold + aggregation on train split;
 * evaluate best config on val split. Writes calibration report JSON.
 *
 * Usage: yarn calibrate:detectors
 */
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  confusionFromPairs,
  f1Score,
  formatPct,
  precision,
  recall,
} from './lib/benchmark-metrics.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const MANIFEST_PATH = join(DATASET_DIR, 'manifest.json');
const REPORT_JSON = join(DATASET_DIR, 'reports', 'calibration-latest.json');
const DETECTOR_BASE_DIST = join(ROOT, 'packages', 'services', 'detectors', 'base', 'dist', 'index.js');

const DSP_DETECTORS = [
  {
    name: 'harmonic',
    dist: join(ROOT, 'packages', 'services', 'detectors', 'harmonic', 'dist', 'index.js'),
    label: 'harmonic-detector',
    create: (mod) => mod.createHarmonicDetector(),
    fftSize: (mod) => mod.DEFAULT_FFT_SIZE,
  },
  {
    name: 'cepstral',
    dist: join(ROOT, 'packages', 'services', 'detectors', 'cepstral', 'dist', 'index.js'),
    label: 'cepstral-detector',
    create: (mod) => mod.createCepstralDetector(),
    fftSize: (mod) => mod.DEFAULT_FFT_SIZE,
  },
  {
    name: 'spectral-flux',
    dist: join(ROOT, 'packages', 'services', 'detectors', 'spectral-flux', 'dist', 'index.js'),
    label: 'spectral-flux-detector',
    create: (mod) => mod.createSpectralFluxDetector(),
    fftSize: (mod) => mod.DEFAULT_FFT_SIZE,
  },
];

const AGGREGATIONS = [
  { mode: 'any-frame', minDroneFrameRatio: undefined },
  { mode: 'majority', minDroneFrameRatio: undefined },
  { mode: 'min-ratio', minDroneFrameRatio: 0.6 },
  { mode: 'min-ratio', minDroneFrameRatio: 0.75 },
];

const THRESHOLD_GRID = [];
for (let t = 0; t <= 0.95; t += 0.05) {
  THRESHOLD_GRID.push(Math.round(t * 100) / 100);
}

const STAGE_GATE = { precision: 0.85, recall: 0.9 };

async function ensureBuilt(distPath, label) {
  try {
    await access(distPath);
  } catch {
    throw new Error(`${label} not built. Run: yarn turbo run build --filter=@membrana/detector-base ...`);
  }
}

function metricsFromPairs(pairs) {
  const { tp, fp, fn, tn } = confusionFromPairs(pairs);
  const prec = precision(tp, fp);
  const rec = recall(tp, fn);
  return {
    tp,
    fp,
    fn,
    tn,
    precision: prec,
    recall: rec,
    f1: f1Score(prec, rec),
    accuracy: pairs.length ? (tp + tn) / pairs.length : null,
  };
}

function passesStageGate(m) {
  return (
    m.precision != null &&
    m.recall != null &&
    m.precision >= STAGE_GATE.precision &&
    m.recall >= STAGE_GATE.recall
  );
}

function predictWithConfig(row, config) {
  let base = false;
  switch (config.aggregation) {
    case 'majority':
      base = row.frames.majority;
      break;
    case 'min-ratio':
      base = config.minDroneFrameRatio >= 0.75 ? row.frames.minRatio075 : row.frames.minRatio06;
      break;
    default:
      base = row.frames.anyFrame;
      break;
  }
  return base && row.maxConfidence >= config.sampleConfidenceThreshold;
}

async function runPerSampleRaw(manifestSamples, spec, analyzeSample) {
  await ensureBuilt(spec.dist, spec.label);
  const mod = await import(pathToFileURL(spec.dist).href);
  const detector = spec.create(mod);
  const fftSize = spec.fftSize(mod);

  const rows = [];
  for (const entry of manifestSamples) {
    const wavPath = join(DATASET_DIR, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);

    const anyFrame = await analyzeSample(samples, sampleRate, detector, {
      fftSize,
      aggregation: 'any-frame',
    });
    const majority = await analyzeSample(samples, sampleRate, detector, {
      fftSize,
      aggregation: 'majority',
    });
    const minRatio06 = await analyzeSample(samples, sampleRate, detector, {
      fftSize,
      aggregation: 'min-ratio',
      minDroneFrameRatio: 0.6,
    });
    const minRatio075 = await analyzeSample(samples, sampleRate, detector, {
      fftSize,
      aggregation: 'min-ratio',
      minDroneFrameRatio: 0.75,
    });

    rows.push({
      id: entry.id,
      truthDrone: entry.label === 'drone',
      maxConfidence: anyFrame.verdict.maxFrameConfidence,
      frames: {
        anyFrame: anyFrame.verdict.isDrone,
        majority: majority.verdict.isDrone,
        minRatio06: minRatio06.verdict.isDrone,
        minRatio075: minRatio075.verdict.isDrone,
      },
    });
  }
  return rows;
}

function searchBestConfig(trainRows, detectorName) {
  let best = null;
  for (const agg of AGGREGATIONS) {
    for (const threshold of THRESHOLD_GRID) {
      const config = {
        aggregation: agg.mode,
        minDroneFrameRatio: agg.minDroneFrameRatio,
        sampleConfidenceThreshold: threshold,
      };
      const pairs = trainRows.map((row) => ({
        truthDrone: row.truthDrone,
        predDrone: predictWithConfig(row, config),
      }));
      const m = metricsFromPairs(pairs);
      const score = m.f1 ?? 0;
      if (!best || score > (best.train.f1 ?? 0)) {
        best = { detectorName, config, train: m };
      }
    }
  }
  return best;
}

function evaluateConfig(rows, config) {
  const pairs = rows.map((row) => ({
    truthDrone: row.truthDrone,
    predDrone: predictWithConfig(row, config),
  }));
  return metricsFromPairs(pairs);
}

async function main() {
  await ensureBuilt(DETECTOR_BASE_DIST, 'detector-base');
  const { analyzeSample } = await import(pathToFileURL(DETECTOR_BASE_DIST).href);

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const trainSamples = manifest.samples.filter((s) => s.split === 'train');
  const valSamples = manifest.samples.filter((s) => s.split === 'val');

  if (trainSamples.length === 0 || valSamples.length === 0) {
    throw new Error(
      'Manifest missing train/val splits. Run: node scripts/assign-dataset-splits.mjs',
    );
  }

  const results = [];

  for (const spec of DSP_DETECTORS) {
    const trainRows = await runPerSampleRaw(trainSamples, spec, analyzeSample);
    const valRows = await runPerSampleRaw(valSamples, spec, analyzeSample);

    const defaultPairs = trainRows.map((row) => ({
      truthDrone: row.truthDrone,
      predDrone: row.frames.anyFrame,
    }));
    const defaultTrain = metricsFromPairs(defaultPairs);

    const best = searchBestConfig(trainRows, spec.name);
    const valMetrics = best ? evaluateConfig(valRows, best.config) : null;

    results.push({
      name: spec.name,
      defaultTrain,
      bestConfig: best?.config ?? null,
      train: best?.train ?? null,
      val: valMetrics,
      stageGatePassed: valMetrics ? passesStageGate(valMetrics) : false,
    });

    console.log(
      `${spec.name}: default train F1=${formatPct(defaultTrain.f1)} → tuned val F1=${formatPct(valMetrics?.f1)} P=${formatPct(valMetrics?.precision)} R=${formatPct(valMetrics?.recall)}`,
    );
    if (best?.config) {
      console.log(`  best: agg=${best.config.aggregation} thr=${best.config.sampleConfidenceThreshold}`);
    }
  }

  const bestOverall = results.reduce((a, b) =>
    (b.val?.f1 ?? 0) > (a.val?.f1 ?? 0) ? b : a,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    dataset: 'v0.2',
    trainCount: trainSamples.length,
    valCount: valSamples.length,
    stageGate: STAGE_GATE,
    stageGatePassed: results.some((r) => r.stageGatePassed),
    bestOverall: {
      name: bestOverall.name,
      val: bestOverall.val,
      config: bestOverall.bestConfig,
    },
    detectors: results,
  };

  await mkdir(dirname(REPORT_JSON), { recursive: true });
  await writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${REPORT_JSON}`);
  console.log(
    `Stage-gate (P≥85%, R≥90%): ${report.stageGatePassed ? 'PASSED' : 'NOT PASSED'}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
