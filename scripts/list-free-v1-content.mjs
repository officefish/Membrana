#!/usr/bin/env node
/** Owner: Ozhegov. Verify and print the seven-class free-v1 inventory. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_ROOT = join(ROOT, 'docs', 'datasets', 'free-v1');
const CLASSES = ['silence', 'wind', 'birds', 'speech', 'machine-hum', 'gunshot'];

async function main() {
  const benchmark = JSON.parse(
    await readFile(join(ROOT, 'data', 'detectors-benchmark', 'v0.2', 'manifest.json'), 'utf8'),
  );
  const rows = [{
    class: 'drone',
    samples: benchmark.samples.filter((sample) => sample.label === 'drone').length,
    real: benchmark.samples.filter((sample) => sample.label === 'drone').length,
    synthetic: 0,
    status: 'existing',
  }];

  for (const kind of CLASSES) {
    const dir = join(DATASET_ROOT, kind);
    const metadata = JSON.parse(await readFile(join(dir, 'metadata.json'), 'utf8'));
    const files = new Set((await readdir(dir)).filter((file) => file.endsWith('.wav')));
    const missing = metadata.filter((row) => !files.has(row.file));
    const unregistered = [...files].filter((file) => !metadata.some((row) => row.file === file));
    if (missing.length || unregistered.length) {
      throw new Error(`${kind}: metadata mismatch (missing=${missing.length}, unregistered=${unregistered.length})`);
    }
    rows.push({
      class: kind,
      samples: metadata.length,
      real: metadata.filter((row) => row.provenance === 'real').length,
      synthetic: metadata.filter((row) => row.provenance === 'synthetic').length,
      status: metadata.every((row) => row.provenance === 'real') ? 'field-ready' : 'bootstrap',
    });
  }
  console.table(rows);
  console.log(`Classes: ${rows.length}; samples: ${rows.reduce((sum, row) => sum + row.samples, 0)}`);
  await writeFile(
    join(DATASET_ROOT, 'content-summary.json'),
    `${JSON.stringify({ owner: 'Kuryokhin', classes: rows }, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
