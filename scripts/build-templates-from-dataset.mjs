#!/usr/bin/env node
/**
 * Build DRONE_CURATED template from validated drone samples in benchmark manifest.
 *
 * Usage: yarn templates:build-from-dataset
 *
 * Writes:
 *   data/detectors-benchmark/v0.2/curated-drone-templates.json
 *   packages/services/detectors/template-match/src/data/curated-drone-templates.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const MANIFEST_PATH = join(DATASET_DIR, 'manifest.json');
const OUT_BENCHMARK = join(DATASET_DIR, 'curated-drone-templates.json');
const OUT_PACKAGE = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'template-match',
  'src',
  'data',
  'curated-drone-templates.json',
);

const TM_DIST = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'template-match',
  'dist',
  'index.js',
);

async function loadTemplateMatchApi() {
  try {
    return await import(pathToFileURL(TM_DIST).href);
  } catch {
    throw new Error(
      'Build @membrana/template-match-detector-service first: yarn workspace @membrana/template-match-detector-service build',
    );
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const droneEntries = manifest.samples.filter((s) => s.label === 'drone');
  if (droneEntries.length === 0) {
    throw new Error('No drone-labeled samples in manifest');
  }

  const {
    collectMetricSamples,
    buildTemplateFromMetricSamples,
    mergeCuratedDroneTemplate,
  } = await loadTemplateMatchApi();

  const perSampleTemplates = [];
  for (const entry of droneEntries) {
    const wavPath = join(DATASET_DIR, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const metrics = collectMetricSamples(samples, sampleRate);
    if (metrics.length === 0) continue;
    perSampleTemplates.push(
      buildTemplateFromMetricSamples(metrics, `DRONE_${entry.id}`, entry.id),
    );
  }

  const curated = mergeCuratedDroneTemplate(perSampleTemplates);
  const payload = [curated];
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  await writeFile(OUT_BENCHMARK, json, 'utf8');
  await writeFile(OUT_PACKAGE, json, 'utf8');

  console.log(`Built DRONE_CURATED from ${perSampleTemplates.length} drone samples`);
  console.log(`Wrote ${OUT_BENCHMARK}`);
  console.log(`Wrote ${OUT_PACKAGE}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
