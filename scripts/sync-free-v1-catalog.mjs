/**
 * Syncs free-v1 catalog (120 × 5s WAV) to benchmark v0.2 and client public assets.
 * Source: docs/datasets/samples/real-collection/
 *
 * Usage: yarn dataset:sync-free-v1
 */
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'docs', 'datasets', 'samples', 'real-collection');
const V02_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const PUBLIC_DIR = join(ROOT, 'apps', 'client', 'public', 'catalog', 'free-v1');
const CATALOG_ID = 'free-v1-catalog';

async function copyTree(subdir) {
  const src = join(SOURCE_DIR, subdir);
  await cp(src, join(V02_DIR, subdir), { recursive: true, force: true });
  await cp(src, join(PUBLIC_DIR, subdir), { recursive: true, force: true });
}

async function main() {
  const raw = JSON.parse(await readFile(join(SOURCE_DIR, 'manifest.json'), 'utf8'));
  const manifest = {
    version: 2,
    catalogId: CATALOG_ID,
    sampleRate: raw.sampleRate,
    durationSec: raw.durationSec,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/sync-free-v1-catalog.mjs',
    sources: raw.sources,
    samples: raw.samples.map((s) => ({
      id: s.id,
      path: s.path,
      class: s.class,
      label: s.label,
      split: 'test',
      durationSec: s.durationSec,
      sampleRate: s.sampleRate,
      source: s.source,
      notes: s.notes ?? null,
    })),
  };

  await mkdir(V02_DIR, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });
  await copyTree('drone');
  await copyTree('not-drone');

  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(join(V02_DIR, 'manifest.json'), manifestJson, 'utf8');
  await writeFile(join(PUBLIC_DIR, 'manifest.json'), manifestJson, 'utf8');

  console.log(
    `Synced ${manifest.samples.length} samples → data/detectors-benchmark/v0.2/ and apps/client/public/catalog/free-v1/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
