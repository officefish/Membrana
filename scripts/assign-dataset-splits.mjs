/**
 * Assign stratified train/val splits to free-v1 benchmark manifest.
 * Default: 80 train / 40 val (40+40 per class → 27 train + 13 val per class… wait 60 per class)
 * 60 per class: 40 train, 20 val per class = 80 train, 40 val total.
 *
 * Usage: node scripts/assign-dataset-splits.mjs [--dry-run]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = join(ROOT, 'data', 'detectors-benchmark', 'v0.2', 'manifest.json');

/** Fraction of each label group assigned to train (remainder → val). */
const TRAIN_FRACTION = 2 / 3;

function assignSplit(samples) {
  const byLabel = new Map();
  for (const entry of samples) {
    const label = entry.label === 'drone' ? 'drone' : 'not-drone';
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(entry);
  }

  const updated = [];
  for (const [, group] of byLabel) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const trainCount = Math.round(sorted.length * TRAIN_FRACTION);
    for (let i = 0; i < sorted.length; i++) {
      updated.push({
        ...sorted[i],
        split: i < trainCount ? 'train' : 'val',
      });
    }
  }

  return updated.sort((a, b) => a.id.localeCompare(b.id));
}

const dryRun = process.argv.includes('--dry-run');

const raw = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const samples = assignSplit(raw.samples);

const trainN = samples.filter((s) => s.split === 'train').length;
const valN = samples.filter((s) => s.split === 'val').length;
const trainDrone = samples.filter((s) => s.split === 'train' && s.label === 'drone').length;
const valDrone = samples.filter((s) => s.split === 'val' && s.label === 'drone').length;

console.log(`Splits: train=${trainN} (drone ${trainDrone}), val=${valN} (drone ${valDrone})`);

if (!dryRun) {
  const next = {
    ...raw,
    splitPolicy: {
      trainFraction: TRAIN_FRACTION,
      assignedAt: new Date().toISOString(),
      assignedBy: 'scripts/assign-dataset-splits.mjs',
    },
    samples,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`Updated ${MANIFEST_PATH}`);
} else {
  console.log('Dry run — manifest not written.');
}
