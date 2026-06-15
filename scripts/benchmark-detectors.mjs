/**
 * Benchmark detectors on data/detectors-benchmark manifest (v0.2 free-v1 catalog).
 * Usage: yarn benchmark:detectors
 */
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  confusionFromPairs,
  f1Score,
  precision,
  recall,
  sortNumbers,
  percentile,
} from './lib/benchmark-metrics.mjs';
import { patchDetectorBenchmarkMd } from './lib/benchmark-report-md.mjs';
import { filterCuratedSamples } from './lib/manifest-labels.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const MANIFEST_PATH = join(DATASET_DIR, 'manifest.json');
const REPORT_JSON = join(DATASET_DIR, 'reports', 'latest.json');
const BENCHMARK_MD = join(ROOT, 'docs', 'DETECTOR_BENCHMARK.md');
const TEMPLATE_MATCH_DIST = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'template-match',
  'dist',
  'index.js',
);
const CURATED_TEMPLATES_JSON = join(DATASET_DIR, 'curated-drone-templates.json');
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

async function ensureBuilt(distPath, label) {
  try {
    await access(distPath);
  } catch {
    throw new Error(
      `${label} not built. Run: yarn benchmark:detectors (builds detector packages via turbo)`,
    );
  }
}

async function runDetector(manifestSamples, spec) {
  await ensureBuilt(spec.dist, spec.label);
  const { analyzeSample } = await import(pathToFileURL(DETECTOR_BASE_DIST).href);
  const mod = await import(pathToFileURL(spec.dist).href);
  const detector = spec.create(mod);
  const fftSize = spec.fftSize(mod);

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(DATASET_DIR, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const { verdict, frameLatenciesMs } = await analyzeSample(samples, sampleRate, detector, {
      fftSize,
    });
    const truthDrone = entry.label === 'drone';
    perSample.push({
      id: entry.id,
      truthDrone,
      predDrone: verdict.isDrone,
      maxConfidence: verdict.confidence,
    });
    allLatencies.push(...frameLatenciesMs);
  }

  const pairs = perSample.map((s) => ({
    truthDrone: s.truthDrone,
    predDrone: s.predDrone,
  }));
  const { tp, fp, fn, tn } = confusionFromPairs(pairs);
  const prec = precision(tp, fp);
  const rec = recall(tp, fn);
  const sortedLat = sortNumbers(allLatencies);

  return {
    name: spec.name,
    family: 'dsp',
    status: 'benchmarked',
    metrics: {
      tp,
      fp,
      fn,
      tn,
      precision: prec,
      recall: rec,
      f1: f1Score(prec, rec),
      latencyP50Ms: percentile(sortedLat, 50),
      latencyP95Ms: percentile(sortedLat, 95),
    },
    perSample,
  };
}

async function runTemplateMatch(manifestSamples) {
  await ensureBuilt(TEMPLATE_MATCH_DIST, 'template-match-detector');
  const mod = await import(pathToFileURL(TEMPLATE_MATCH_DIST).href);

  let curatedDrone = mod.DEFAULT_CURATED_DRONE_TEMPLATES;
  try {
    curatedDrone = JSON.parse(await readFile(CURATED_TEMPLATES_JSON, 'utf8'));
  } catch {
    // use package default
  }

  const detector = mod.createTemplateMatchDetector({
    templates: mod.resolveTemplateMatchCatalog(curatedDrone),
  });

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(DATASET_DIR, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const verdict = await mod.analyzeTemplateMatch(samples, sampleRate, detector);
    perSample.push({
      id: entry.id,
      truthDrone: entry.label === 'drone',
      predDrone: verdict.isDrone,
      maxConfidence: verdict.confidence,
    });
    allLatencies.push(verdict.latencyMsTotal);
  }

  const pairs = perSample.map((s) => ({
    truthDrone: s.truthDrone,
    predDrone: s.predDrone,
  }));
  const { tp, fp, fn, tn } = confusionFromPairs(pairs);
  const prec = precision(tp, fp);
  const rec = recall(tp, fn);
  const sortedLat = sortNumbers(allLatencies);

  return {
    name: 'template-match',
    family: 'dsp',
    status: 'benchmarked',
    metrics: {
      tp,
      fp,
      fn,
      tn,
      precision: prec,
      recall: rec,
      f1: f1Score(prec, rec),
      latencyP50Ms: percentile(sortedLat, 50),
      latencyP95Ms: percentile(sortedLat, 95),
    },
    perSample,
  };
}

const SCAFFOLD_DETECTORS = [
  { name: 'yamnet', family: 'neural', status: 'scaffold' },
  { name: 'clap', family: 'neural', status: 'scaffold' },
  { name: 'agentic-claude', family: 'agentic', status: 'scaffold' },
];

async function main() {
  await ensureBuilt(DETECTOR_BASE_DIST, 'detector-base');

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const curated = filterCuratedSamples(manifest.samples);
  const withSplit = curated.filter((s) => s.split === 'test');
  const testSamples = withSplit.length > 0 ? withSplit : curated;
  const skippedUnlabeled = manifest.samples.length - curated.length;
  if (skippedUnlabeled > 0) {
    console.log(`Skipping ${skippedUnlabeled} unlabeled samples`);
  }
  if (testSamples.length === 0) {
    throw new Error('No samples in manifest — run yarn dataset:sync-free-v1');
  }

  console.log(`Benchmark: ${testSamples.length} samples (dataset v${manifest.version})`);

  const benchmarked = [];
  for (const spec of DSP_DETECTORS) {
    const result = await runDetector(testSamples, spec);
    benchmarked.push(result);
    const m = result.metrics;
    console.log(
      `${spec.name}: precision=${m.precision?.toFixed(3) ?? '—'} recall=${m.recall?.toFixed(3) ?? '—'} F1=${m.f1?.toFixed(3) ?? '—'}`,
    );
  }

  const templateResult = await runTemplateMatch(testSamples);
  benchmarked.push(templateResult);
  {
    const m = templateResult.metrics;
    console.log(
      `template-match: precision=${m.precision?.toFixed(3) ?? '—'} recall=${m.recall?.toFixed(3) ?? '—'} F1=${m.f1?.toFixed(3) ?? '—'}`,
    );
  }

  const detectors = [
    ...benchmarked,
    ...SCAFFOLD_DETECTORS.map((d) => ({ ...d, metrics: null, perSample: null })),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    datasetVersion: `v${manifest.version}`,
    curatedOnly: true,
    skippedUnlabeled,
    groundTruth: manifest.groundTruth ?? null,
    sampleCount: testSamples.length,
    manifestPath: 'data/detectors-benchmark/v0.2/manifest.json',
    detectors,
  };

  await mkdir(dirname(REPORT_JSON), { recursive: true });
  await writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${REPORT_JSON}`);

  const md = await readFile(BENCHMARK_MD, 'utf8');
  const patched = patchDetectorBenchmarkMd(md, report);
  await writeFile(BENCHMARK_MD, patched, 'utf8');
  console.log(`Updated ${BENCHMARK_MD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
