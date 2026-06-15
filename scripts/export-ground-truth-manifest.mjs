#!/usr/bin/env node
/**
 * VDR3: merge cabinet tariff catalog ground truth into benchmark manifest.
 *
 * Usage:
 *   yarn dataset:export-ground-truth                 # fetch prod via SSH (.env)
 *   yarn dataset:export-ground-truth --from-prod       # same
 *   yarn dataset:export-ground-truth --input snap.json # offline snapshot
 *   yarn dataset:export-ground-truth --dry-run
 *
 * Writes:
 *   data/detectors-benchmark/v0.2/manifest.json
 *   data/detectors-benchmark/v0.2/catalog-ground-truth-snapshot.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchGroundTruthFromCabinet } from './lib/cabinet-catalog-client.mjs';
import { fetchCatalogGroundTruthViaSsh } from './lib/fetch-catalog-prod-ssh.mjs';
import { mergeGroundTruthIntoManifest } from './lib/ground-truth-export.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const V02_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const MANIFEST_PATH = join(V02_DIR, 'manifest.json');
const SNAPSHOT_PATH = join(V02_DIR, 'catalog-ground-truth-snapshot.json');

function usage() {
  console.log(`Usage: node scripts/export-ground-truth-manifest.mjs [options]

Options:
  --from-prod       Fetch catalog from prod cabinet API via SSH (default)
  --input <path>    Use JSON snapshot { samples, catalogId?, membraneId? }
  --api <url>       Cabinet API base (with --login/--password)
  --login <user>    Cabinet login (local HTTP, not SSH)
  --password <pw>   Cabinet password
  --membrane-id <id> Override membrane id
  --dry-run         Print stats only; do not write manifest
  -h, --help        This help
`);
}

function parseArgs(argv) {
  const opts = {
    fromProd: true,
    input: null,
    apiBase: process.env.CABINET_API_URL ?? 'https://cabinet.membrana.space',
    login: process.env.CABINET_LOGIN ?? 'admin',
    password: process.env.CABINET_PASSWORD ?? '',
    membraneId: process.env.CABINET_MEMBRANE_ID ?? undefined,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--from-prod') {
      opts.fromProd = true;
      opts.input = null;
    } else if (arg === '--input') {
      opts.input = argv[++i] ?? '';
      opts.fromProd = false;
    } else if (arg === '--api') opts.apiBase = argv[++i] ?? opts.apiBase;
    else if (arg === '--login') opts.login = argv[++i] ?? opts.login;
    else if (arg === '--password') opts.password = argv[++i] ?? '';
    else if (arg === '--membrane-id') opts.membraneId = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return opts;
}

/**
 * @param {import('./lib/ground-truth-export.mjs').CatalogSampleRef[]} samples
 */
function summarizeLabels(samples) {
  const counts = { drone: 0, 'not-drone': 0, unlabeled: 0 };
  for (const s of samples) {
    const label = s.label === 'drone' ? 'drone' : s.label === 'not-drone' || s.label === 'not_drone' ? 'not-drone' : 'unlabeled';
    counts[label] += 1;
  }
  return counts;
}

async function loadCatalogSnapshot(opts) {
  if (opts.input) {
    const raw = JSON.parse(await readFile(opts.input, 'utf8'));
    if (!Array.isArray(raw.samples)) {
      throw new Error(`Snapshot ${opts.input} must contain samples[]`);
    }
    return {
      samples: raw.samples,
      catalogId: raw.catalogId ?? 'free-v1-catalog',
      sampleCount: raw.sampleCount ?? raw.samples.length,
      membraneId: raw.membraneId ?? 'unknown',
      apiBase: raw.apiBase ?? opts.apiBase,
      fetchedAt: raw.fetchedAt ?? new Date().toISOString(),
    };
  }

  if (opts.fromProd) {
    return fetchCatalogGroundTruthViaSsh();
  }

  if (!opts.password) {
    throw new Error('Set CABINET_PASSWORD or use --from-prod / --input');
  }

  return fetchGroundTruthFromCabinet({
    apiBase: opts.apiBase,
    login: opts.login,
    password: opts.password,
    membraneId: opts.membraneId,
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const catalog = await loadCatalogSnapshot(opts);

  const { samples, stats } = mergeGroundTruthIntoManifest(manifest.samples, catalog.samples);
  const labelCounts = summarizeLabels(samples);

  console.log('Ground truth export');
  console.log(`  source: ${opts.input ? opts.input : opts.fromProd ? 'prod SSH → cabinet API' : catalog.apiBase}`);
  console.log(`  catalog samples: ${catalog.samples.length} (expected ${catalog.sampleCount})`);
  console.log(`  manifest entries: ${stats.manifestTotal}`);
  console.log(`  labeled: ${stats.labeled}, unlabeled: ${stats.unlabeled}`);
  console.log(`  notes changed: ${stats.notesUpdated}`);
  console.log(`  labels in manifest: drone=${labelCounts.drone}, not-drone=${labelCounts['not-drone']}, unlabeled=${labelCounts.unlabeled}`);

  if (stats.missingInCatalog.length > 0) {
    console.warn(`  WARN: ${stats.missingInCatalog.length} manifest ids missing in catalog (first 5):`);
    console.warn(`    ${stats.missingInCatalog.slice(0, 5).join(', ')}`);
  }

  if (labelCounts.unlabeled > 0) {
    console.warn(`  WARN: ${labelCounts.unlabeled} samples still unlabeled — VDR4 blocked until curated`);
  }

  if (opts.dryRun) {
    console.log('Dry run — manifest not written.');
    return;
  }

  const snapshot = {
    exportedAt: new Date().toISOString(),
    exportedBy: 'scripts/export-ground-truth-manifest.mjs',
    apiBase: catalog.apiBase,
    membraneId: catalog.membraneId,
    catalogId: catalog.catalogId,
    sampleCount: catalog.sampleCount,
    fetchedAt: catalog.fetchedAt,
    samples: catalog.samples,
  };

  const nextManifest = {
    ...manifest,
    groundTruth: {
      exportedAt: snapshot.exportedAt,
      exportedBy: 'scripts/export-ground-truth-manifest.mjs',
      source: opts.input ? `snapshot:${opts.input}` : 'cabinet.membrana.space catalog API',
      membraneId: catalog.membraneId,
      catalogId: catalog.catalogId,
      labeledCount: stats.labeled,
      unlabeledCount: stats.unlabeled,
    },
    samples,
  };

  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${SNAPSHOT_PATH}`);
  console.log(`Updated ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
