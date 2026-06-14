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
const HARMONIC_DIST = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'harmonic',
  'dist',
  'index.js',
);

async function ensureHarmonicBuilt() {
  try {
    await access(HARMONIC_DIST);
  } catch {
    throw new Error(
      'Harmonic detector not built. Run: yarn turbo run build --filter=@membrana/harmonic-detector-service',
    );
  }
}

/** @param {Float32Array} samples @param {number} fftSize @param {number} hop */
function* iterWindows(samples, fftSize, hop) {
  for (let start = 0; start + fftSize <= samples.length; start += hop) {
    yield samples.subarray(start, start + fftSize);
  }
}

/**
 * @param {import('@membrana/harmonic-detector-service').DroneDetector} detector
 * @param {Float32Array} samples
 * @param {number} sampleRate
 * @param {number} fftSize
 */
async function evaluateFile(detector, samples, sampleRate, fftSize) {
  const hop = Math.floor(fftSize / 2);
  const latencies = [];
  let predictedDrone = false;
  let maxConfidence = 0;

  for (const chunk of iterWindows(samples, fftSize, hop)) {
    const result = await detector.detect({
      samples: chunk,
      sampleRate,
      timestamp: 0,
      durationSec: chunk.length / sampleRate,
    });
    latencies.push(result.latencyMs);
    if (result.isDrone) predictedDrone = true;
    if (result.confidence > maxConfidence) maxConfidence = result.confidence;
  }

  return { predictedDrone, maxConfidence, latencies };
}

async function runHarmonic(manifestSamples) {
  const { createHarmonicDetector, DEFAULT_FFT_SIZE } = await import(
    pathToFileURL(HARMONIC_DIST).href
  );
  const detector = createHarmonicDetector();
  const fftSize = DEFAULT_FFT_SIZE;

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(DATASET_DIR, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const { predictedDrone, maxConfidence, latencies } = await evaluateFile(
      detector,
      samples,
      sampleRate,
      fftSize,
    );
    const truthDrone = entry.label === 'drone';
    perSample.push({
      id: entry.id,
      truthDrone,
      predDrone: predictedDrone,
      maxConfidence,
    });
    allLatencies.push(...latencies);
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
  await ensureHarmonicBuilt();

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
