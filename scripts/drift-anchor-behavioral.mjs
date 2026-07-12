#!/usr/bin/env node
/**
 * Drift-Anchor — поведенческий якорь (DA2, Якорь-B).
 *
 * Прогоняет golden drone-сэмпл через 3 DSP-детектора (harmonic/cepstral/spectral-flux)
 * и сливает в `combinedScore` через fusion-ядро — детерминированно (тот же WAV + версии
 * детекторов → тот же score). Ловит тихий дрейф ЯДРА детекции ДО соревнования (консилиум
 * nightly-agents-platform). Выход — behavioral-компонент(ы) снапшота @membrana/drift-anchor.
 *
 * Требует собранных детекторов: `yarn benchmark:detectors` (turbo build) — см. ensureBuilt.
 * Usage: node scripts/drift-anchor-behavioral.mjs [--sample <wav>]
 */

import { access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Золотой drone-сэмпл (размеченный каталог free-v1). Меняется осознанно + baseline-коммит. */
export const GOLDEN_DRONE_SAMPLE = 'apps/client/public/catalog/free-v1/drone/drone-dad-0030.wav';

const DETECTOR_BASE_DIST = join(ROOT, 'packages/services/detectors/base/dist/index.js');
const ENSEMBLE_DIST = join(ROOT, 'packages/services/detection-ensemble-service/dist/index.js');

const DSP_DETECTORS = [
  { name: 'harmonic', dist: join(ROOT, 'packages/services/detectors/harmonic/dist/index.js'), create: (m) => m.createHarmonicDetector() },
  { name: 'cepstral', dist: join(ROOT, 'packages/services/detectors/cepstral/dist/index.js'), create: (m) => m.createCepstralDetector() },
  { name: 'spectral-flux', dist: join(ROOT, 'packages/services/detectors/spectral-flux/dist/index.js'), create: (m) => m.createSpectralFluxDetector() },
];

async function ensureBuilt(distPath) {
  try {
    await access(distPath);
  } catch {
    throw new Error(`${distPath} не собран. Запусти: yarn benchmark:detectors (turbo build детекторов)`);
  }
}

/** Детерминированный combinedScore golden-сэмпла. Округление до 4 знаков — против float-шума. */
export async function computeGoldenCombinedScore(samplePath = GOLDEN_DRONE_SAMPLE) {
  await ensureBuilt(DETECTOR_BASE_DIST);
  await ensureBuilt(ENSEMBLE_DIST);
  const { analyzeSample } = await import(pathToFileURL(DETECTOR_BASE_DIST).href);
  const { fuseDetectorResults } = await import(pathToFileURL(ENSEMBLE_DIST).href);

  const { samples, sampleRate } = await readWavMono(resolve(ROOT, samplePath));

  const snapshots = [];
  for (const spec of DSP_DETECTORS) {
    await ensureBuilt(spec.dist);
    const mod = await import(pathToFileURL(spec.dist).href);
    const detector = spec.create(mod);
    const fftSize = mod.DEFAULT_FFT_SIZE ?? 2048;
    const { verdict } = await analyzeSample(samples, sampleRate, detector, { fftSize });
    // verdict.latencyMsTotal недетерминирован (тайминг) — НЕ якорим; берём только confidence/isDrone.
    snapshots.push({
      name: spec.name,
      family: detector.family,
      result: { isDrone: verdict.isDrone, confidence: verdict.confidence, latencyMs: 0 },
    });
  }

  const fusion = fuseDetectorResults(snapshots);
  const combinedScore = Number(fusion.combinedScore.toFixed(4));
  const perDetector = Object.fromEntries(
    snapshots.map((s) => [s.name, Number(s.result.confidence.toFixed(4))]),
  );
  return { combinedScore, perDetector, sampleRate, samplePath };
}

/** Behavioral-компоненты снапшота: combinedScore + per-detector confidences. */
export async function buildBehavioralComponents(samplePath = GOLDEN_DRONE_SAMPLE) {
  const { combinedScore, perDetector } = await computeGoldenCombinedScore(samplePath);
  const components = [
    { id: 'combinedScore:drone-golden', kind: 'behavioral', value: combinedScore },
  ];
  for (const [name, conf] of Object.entries(perDetector)) {
    components.push({ id: `detector:${name}:drone-golden`, kind: 'behavioral', value: conf });
  }
  return components;
}

async function main() {
  const args = process.argv.slice(2);
  const sIdx = args.indexOf('--sample');
  const samplePath = sIdx >= 0 && args[sIdx + 1] ? args[sIdx + 1] : GOLDEN_DRONE_SAMPLE;
  const components = await buildBehavioralComponents(samplePath);
  process.stdout.write(JSON.stringify({ takenAt: new Date().toISOString(), components }, null, 2) + '\n');
}

if (process.argv[1]?.endsWith('drift-anchor-behavioral.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
