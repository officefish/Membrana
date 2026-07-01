#!/usr/bin/env node
/**
 * Leave-one-out QA for the six free-v1 S2 class templates.
 * Owner: Dynin (metrics and interpretation).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_ROOT = join(ROOT, 'docs', 'datasets', 'free-v1');
const CLASSES = ['silence', 'wind', 'birds', 'speech', 'machine-hum', 'gunshot'];
const CLASS_KEYS = Object.fromEntries(CLASSES.map((value) => [value, value.toUpperCase().replace(/-/g, '_')]));

async function loadApi() {
  const dist = join(ROOT, 'packages', 'services', 'detectors', 'template-match', 'dist', 'index.js');
  return import(pathToFileURL(dist).href);
}

function center(bounds) {
  return (bounds.min + bounds.max) / 2;
}

function rangeScore(value, bounds) {
  const width = Math.max(Math.abs(bounds.max - bounds.min), 1e-9);
  if (value >= bounds.min && value <= bounds.max) return 1;
  const distance = value < bounds.min ? bounds.min - value : value - bounds.max;
  return Math.max(0, 1 - distance / width);
}

function score(sample, candidate) {
  const spectral = ['centroid', 'flux', 'rms'].map((field) =>
    rangeScore(center(sample.thresholds[field]), candidate.thresholds[field]),
  );
  const temporal = ['centroidStd', 'fluxStd', 'rmsStd', 'activityRatio', 'peakToAverageRatio']
    .filter((field) => sample.temporalPatterns[field] && candidate.temporalPatterns[field])
    .map((field) => rangeScore(center(sample.temporalPatterns[field]), candidate.temporalPatterns[field]));
  return [...spectral, ...temporal].reduce((sum, value) => sum + value, 0) /
    (spectral.length + temporal.length);
}

function emptyConfusion() {
  return Object.fromEntries(CLASSES.map((actual) => [actual, Object.fromEntries(CLASSES.map((predicted) => [predicted, 0]))]));
}

function summarize(rows, predicate = () => true) {
  const selected = rows.filter(predicate);
  const confusion = emptyConfusion();
  for (const row of selected) confusion[row.actual][row.predicted]++;
  const metrics = Object.fromEntries(CLASSES.map((kind) => {
    const tp = confusion[kind][kind];
    const actual = selected.filter((row) => row.actual === kind).length;
    const predicted = selected.filter((row) => row.predicted === kind).length;
    const recall = actual === 0 ? null : tp / actual;
    const precision = predicted === 0 ? null : tp / predicted;
    const f1 = recall == null || precision == null || recall + precision === 0
      ? null
      : 2 * precision * recall / (precision + recall);
    return [kind, { samples: actual, precision, recall, f1 }];
  }));
  return {
    samples: selected.length,
    accuracy: selected.length === 0 ? null : selected.filter((row) => row.actual === row.predicted).length / selected.length,
    metrics,
    confusion,
  };
}

function pct(value) {
  return value == null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

async function main() {
  const { collectMetricSamples, buildClassTemplateFromMetricSamples, mergeClassTemplates } = await loadApi();
  const samplesByClass = {};
  const metadataByClass = {};

  for (const kind of CLASSES) {
    const dir = join(DATASET_ROOT, kind);
    const metadata = JSON.parse(await readFile(join(dir, 'metadata.json'), 'utf8'));
    metadataByClass[kind] = new Map(metadata.map((row) => [row.file, row]));
    const files = (await readdir(dir)).filter((file) => file.endsWith('.wav')).sort();
    samplesByClass[kind] = [];
    for (const file of files) {
      const { samples, sampleRate } = await readWavMono(join(dir, file));
      const metrics = collectMetricSamples(samples, sampleRate);
      samplesByClass[kind].push({
        file,
        template: buildClassTemplateFromMetricSamples(metrics, basename(file, '.wav'), {}),
      });
    }
  }

  const fullTemplates = Object.fromEntries(CLASSES.map((kind) => [
    kind,
    mergeClassTemplates(samplesByClass[kind].map((row) => row.template), CLASS_KEYS[kind], {}),
  ]));
  const rows = [];

  for (const actual of CLASSES) {
    for (let index = 0; index < samplesByClass[actual].length; index++) {
      const sample = samplesByClass[actual][index];
      const candidates = { ...fullTemplates };
      candidates[actual] = mergeClassTemplates(
        samplesByClass[actual].filter((_, candidateIndex) => candidateIndex !== index).map((row) => row.template),
        CLASS_KEYS[actual],
        {},
      );
      const scores = Object.fromEntries(CLASSES.map((kind) => [kind, score(sample.template, candidates[kind])]));
      const predicted = CLASSES.reduce((best, kind) => scores[kind] > scores[best] ? kind : best, CLASSES[0]);
      rows.push({
        file: sample.file,
        actual,
        predicted,
        provenance: metadataByClass[actual].get(sample.file)?.provenance ?? 'unknown',
        scores,
      });
    }
  }

  const allSummary = summarize(rows);
  const realSummary = summarize(rows, (row) => row.provenance === 'real');
  const syntheticSummary = summarize(rows, (row) => row.provenance === 'synthetic');
  const allReal = realSummary.samples === allSummary.samples;
  const report = {
    generatedAt: new Date().toISOString(),
    owner: 'Dynin',
    method: 'leave-one-out class-envelope scoring',
    warning: allReal
      ? 'The corpus is real-only. S3 still requires threshold calibration and its own mixed-dataset stage gate.'
      : 'Synthetic bootstrap metrics are not field-validation evidence and cannot unlock S3 production deployment.',
    all: allSummary,
    real: realSummary,
    synthetic: syntheticSummary,
    predictions: rows,
  };
  await writeFile(join(DATASET_ROOT, 'quality-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    '# free-v1 S2 Template Quality Passport',
    '',
    '**Owner:** Dynin  ',
    `**Method:** ${report.method}  `,
    `**Samples:** ${report.all.samples} (${report.real.samples} real, ${report.synthetic.samples} synthetic)`,
    '',
    `> ${report.warning}`,
    '',
    '## Per-class metrics',
    '',
    '| Class | Samples | Precision | Recall | F1 |',
    '|---|---:|---:|---:|---:|',
    ...CLASSES.map((kind) => {
      const metric = report.all.metrics[kind];
      return `| ${kind} | ${metric.samples} | ${pct(metric.precision)} | ${pct(metric.recall)} | ${pct(metric.f1)} |`;
    }),
    '',
    `**Overall accuracy:** ${pct(report.all.accuracy)}  `,
    `**Real-only accuracy:** ${pct(report.real.accuracy)}  `,
    `**Synthetic-only accuracy:** ${pct(report.synthetic.accuracy)}`,
    '',
    '## Confusion matrix',
    '',
    `| Actual \\ Predicted | ${CLASSES.join(' | ')} |`,
    `|---|${CLASSES.map(() => '---:').join('|')}|`,
    ...CLASSES.map((actual) => `| ${actual} | ${CLASSES.map((predicted) => report.all.confusion[actual][predicted]).join(' | ')} |`),
    '',
    '## Gate interpretation',
    '',
    '- S2 content and template-generation mechanics are reproducible.',
    allReal
      ? '- All six S2 classes contain licensed real recordings; synthetic count is zero.'
      : '- Real field coverage is incomplete; synthetic rows must be replaced before closure.',
    '- Current envelope scoring is a baseline, not the S3 production gate; S3 must calibrate routing on the mixed seven-class corpus.',
    '',
  ];
  await writeFile(join(DATASET_ROOT, 'QUALITY_REPORT.md'), `${lines.join('\n')}\n`);
  console.log(`LOO accuracy: ${pct(report.all.accuracy)}; real-only: ${pct(report.real.accuracy)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
