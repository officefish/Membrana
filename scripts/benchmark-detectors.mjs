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
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const MANIFEST_PATH = join(DATASET_DIR, 'manifest.json');
const REPORT_JSON = join(DATASET_DIR, 'reports', 'latest.json');
const BENCHMARK_MD = join(ROOT, 'docs', 'DETECTOR_BENCHMARK.md');
const DETECTOR_BASE_DIST = join(ROOT, 'packages', 'services', 'detectors', 'base', 'dist', 'index.js');
const HARMONIC_DIST = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'harmonic',
  'dist',
  'index.js',
);

async function ensureBuilt(distPath, label) {
  try {
    await access(distPath);
  } catch {
    throw new Error(`${label} not built. Run: yarn turbo run build --filter=@membrana/detector-base --filter=@membrana/harmonic-detector-service`);
  }
}

async function runHarmonic(manifestSamples) {
  const { analyzeSample } = await import(pathToFileURL(DETECTOR_BASE_DIST).href);
  const { createHarmonicDetector, DEFAULT_FFT_SIZE } = await import(
    pathToFileURL(HARMONIC_DIST).href
  );
  const detector = createHarmonicDetector();

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(DATASET_DIR, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const { verdict, frameLatenciesMs } = await analyzeSample(samples, sampleRate, detector, {
      fftSize: DEFAULT_FFT_SIZE,
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
    name: 'harmonic',
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
  { name: 'cepstral', family: 'dsp', status: 'scaffold' },
  { name: 'spectral-flux', family: 'dsp', status: 'scaffold' },
  { name: 'yamnet', family: 'neural', status: 'scaffold' },
  { name: 'clap', family: 'neural', status: 'scaffold' },
  { name: 'agentic-claude', family: 'agentic', status: 'scaffold' },
];

async function main() {
  await ensureBuilt(DETECTOR_BASE_DIST, 'detector-base');
  await ensureBuilt(HARMONIC_DIST, 'harmonic-detector');

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const withSplit = manifest.samples.filter((s) => s.split === 'test');
  const testSamples = withSplit.length > 0 ? withSplit : manifest.samples;
  if (testSamples.length === 0) {
    throw new Error('No samples in manifest — run yarn dataset:sync-free-v1');
  }

  console.log(`Benchmark: ${testSamples.length} samples (dataset v${manifest.version})`);

  const harmonic = await runHarmonic(testSamples);
  const detectors = [harmonic, ...SCAFFOLD_DETECTORS.map((d) => ({ ...d, metrics: null, perSample: null }))];

  const report = {
    generatedAt: new Date().toISOString(),
    datasetVersion: `v${manifest.version}`,
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

  const h = harmonic.metrics;
  console.log(
    `harmonic: precision=${h.precision?.toFixed(3) ?? '—'} recall=${h.recall?.toFixed(3) ?? '—'} F1=${h.f1?.toFixed(3) ?? '—'}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
