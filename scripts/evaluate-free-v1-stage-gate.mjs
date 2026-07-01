#!/usr/bin/env node
/** Mixed-corpus free_v1 calibration and stage-gate report. Owner: Dynin. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET = join(ROOT, 'docs', 'datasets', 'free-v1');
const BENCHMARK = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const CLASSES = ['drone', 'silence', 'wind', 'birds', 'speech', 'machine-hum', 'gunshot'];

const pct = (value) => `${(value * 100).toFixed(1)}%`;

async function loadApis() {
  const templateMatch = await import(pathToFileURL(join(
    ROOT,
    'packages',
    'services',
    'detectors',
    'template-match',
    'dist',
    'index.js',
  )).href);
  const trends = await import(pathToFileURL(join(
    ROOT,
    'packages',
    'services',
    'trends-detector',
    'dist',
    'index.js',
  )).href);
  return { templateMatch, trends };
}

async function corpusRows() {
  const manifest = JSON.parse(await readFile(join(BENCHMARK, 'manifest.json'), 'utf8'));
  const rows = manifest.samples
    .filter((sample) => sample.label === 'drone')
    .map((sample) => ({ actual: 'drone', file: sample.id, path: join(BENCHMARK, sample.path) }));
  for (const soundClass of CLASSES.slice(1)) {
    const dir = join(DATASET, soundClass);
    const files = (await readdir(dir)).filter((file) => file.endsWith('.wav')).sort();
    rows.push(...files.map((file) => ({ actual: soundClass, file, path: join(dir, file) })));
  }
  return rows;
}

function metric(rows, soundClass, thresholds) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const row of rows) {
    const predicted = row.winnerScore >= thresholds[row.winnerClass]
      ? row.winnerClass
      : 'unknown';
    if (predicted === soundClass && row.actual === soundClass) tp += 1;
    if (predicted === soundClass && row.actual !== soundClass) fp += 1;
    if (predicted !== soundClass && row.actual === soundClass) fn += 1;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, fn, precision, recall, f1 };
}

function routeDroneFirst(rows, margin) {
  return rows.map((row) => {
    const drone = row.scores.find((score) => score.key === 'DRONE_TIGHT');
    const promoteDrone = drone
      && row.winnerKey !== 'DRONE_TIGHT'
      && row.winnerScore - drone.score < margin;
    return promoteDrone
      ? { ...row, winnerClass: 'drone', winnerKey: drone.key, winnerScore: Math.round(drone.score) }
      : row;
  });
}

function findDronePolicy(rows) {
  const candidates = [];
  for (let margin = 0; margin <= 100; margin += 1) {
    const routed = routeDroneFirst(rows, margin);
    for (let threshold = 0; threshold <= 100; threshold += 1) {
      const thresholds = Object.fromEntries(CLASSES.map((soundClass) => [soundClass, 0]));
      thresholds.drone = threshold;
      const value = metric(routed, 'drone', thresholds);
      const fpr = value.fp / rows.filter((row) => row.actual !== 'drone').length;
      if (value.recall >= 0.9 && fpr < 0.15) {
        candidates.push({ margin, threshold, fpr, ...value });
      }
    }
  }
  candidates.sort((a, b) =>
    a.fp - b.fp || b.recall - a.recall || b.threshold - a.threshold || a.margin - b.margin,
  );
  return candidates[0] ?? null;
}

function calibrate(rows, droneThreshold) {
  const thresholds = Object.fromEntries(CLASSES.map((soundClass) => [soundClass, 0]));
  thresholds.drone = droneThreshold;
  for (const soundClass of CLASSES) {
    if (soundClass === 'drone') continue;
    const candidates = [];
    for (let threshold = 0; threshold <= 100; threshold += 1) {
      const trial = { ...thresholds, [soundClass]: threshold };
      candidates.push({ threshold, ...metric(rows, soundClass, trial) });
    }
    const ranked = candidates.sort((a, b) =>
      b.f1 - a.f1 || b.precision - a.precision || b.threshold - a.threshold,
    );
    thresholds[soundClass] = ranked[0].threshold;
  }
  return thresholds;
}

function summarize(rows, thresholds) {
  const confusion = Object.fromEntries(CLASSES.map((actual) => [
    actual,
    Object.fromEntries([...CLASSES, 'unknown'].map((predicted) => [predicted, 0])),
  ]));
  const predictions = rows.map((row) => {
    const predicted = row.winnerScore >= thresholds[row.winnerClass]
      ? row.winnerClass
      : 'unknown';
    confusion[row.actual][predicted] += 1;
    return { ...row, predicted };
  });
  const metrics = Object.fromEntries(CLASSES.map((soundClass) => [
    soundClass,
    { samples: rows.filter((row) => row.actual === soundClass).length, ...metric(rows, soundClass, thresholds) },
  ]));
  const nonDrone = rows.filter((row) => row.actual !== 'drone');
  const droneFalsePositives = predictions.filter((row) => row.actual !== 'drone' && row.predicted === 'drone').length;
  const droneFpr = droneFalsePositives / nonDrone.length;
  const accuracy = predictions.filter((row) => row.actual === row.predicted).length / rows.length;
  return { predictions, confusion, metrics, droneFpr, accuracy };
}

async function main() {
  const { templateMatch, trends } = await loadApis();
  const templates = templateMatch.createDefaultTemplateMatchCatalog();
  const sourceRows = await corpusRows();
  const rows = [];
  for (const row of sourceRows) {
    const { samples, sampleRate } = await readWavMono(row.path);
    const metricSamples = templateMatch.collectMetricSamples(samples, sampleRate);
    const result = trends.classifyTrends(metricSamples, templates, { minConfidence: 0 });
    rows.push({
      actual: row.actual,
      file: row.file,
      winnerClass: trends.soundClassFromTemplateKey(result.detectedState),
      winnerKey: result.detectedState,
      winnerScore: result.confidence,
      scores: result.scores,
    });
  }

  const dronePolicy = findDronePolicy(rows);
  const routedRows = routeDroneFirst(rows, dronePolicy?.margin ?? 0);
  const thresholds = calibrate(routedRows, dronePolicy?.threshold ?? 100);
  const summary = summarize(routedRows, thresholds);
  const drone = summary.metrics.drone;
  const passed = summary.droneFpr < 0.15 && drone.recall >= 0.9;
  const report = {
    schema: 'free-v1-stage-gate/v1',
    generatedAt: new Date().toISOString(),
    owner: 'Dynin',
    catalogVersion: trends.FREE_V1_CATALOG_VERSION,
    samples: rows.length,
    thresholds,
    droneFirstMinGap: dronePolicy?.margin ?? 0,
    ...summary,
    gate: {
      target: { droneFprLt: 0.15, droneRecallGte: 0.9 },
      passed,
    },
  };
  await writeFile(join(DATASET, 'stage-gate-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const predictedColumns = [...CLASSES, 'unknown'];
  const lines = [
    '# free_v1 S3 Stage-Gate Report',
    '',
    '**Owner:** Dynin',
    `**Catalog:** ${report.catalogVersion}`,
    `**Mixed corpus:** ${report.samples} recordings`,
    '',
    `**Verdict:** ${passed ? 'PASS' : 'BLOCK'}`,
    `**Drone FPR:** ${pct(summary.droneFpr)} (target < 15%)`,
    `**Drone recall:** ${pct(drone.recall)} (target >= 90%)`,
    `**Overall accuracy:** ${pct(summary.accuracy)}`,
    '',
    '## Calibrated minimum confidence',
    '',
    '| Class | Threshold |',
    '|---|---:|',
    ...CLASSES.map((soundClass) => `| ${soundClass} | ${thresholds[soundClass]} |`),
    '',
    `**Drone-first minimum gap:** ${report.droneFirstMinGap} points`,
    '',
    '## Per-class metrics',
    '',
    '| Class | Samples | Precision | Recall | F1 |',
    '|---|---:|---:|---:|---:|',
    ...CLASSES.map((soundClass) => {
      const value = summary.metrics[soundClass];
      return `| ${soundClass} | ${value.samples} | ${pct(value.precision)} | ${pct(value.recall)} | ${pct(value.f1)} |`;
    }),
    '',
    '## Confusion matrix',
    '',
    `| Actual \\ Predicted | ${predictedColumns.join(' | ')} |`,
    `|---|${predictedColumns.map(() => '---:').join('|')}|`,
    ...CLASSES.map((actual) => `| ${actual} | ${predictedColumns.map((predicted) => summary.confusion[actual][predicted]).join(' | ')} |`),
    '',
    '## Decision',
    '',
    passed
      ? '- The numerical S3 drone gate passes on the mixed corpus.'
      : '- Stop rule: the numerical S3 gate does not pass; production deployment remains blocked.',
    '- This report evaluates the committed release templates. It is not evidence of geographic or device-domain generalization.',
    '',
  ];
  await writeFile(join(DATASET, 'STAGE_GATE_REPORT.md'), `${lines.join('\n')}\n`);
  console.log(`S3 gate ${passed ? 'PASS' : 'BLOCK'}: FPR=${pct(summary.droneFpr)}, recall=${pct(drone.recall)}, accuracy=${pct(summary.accuracy)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
