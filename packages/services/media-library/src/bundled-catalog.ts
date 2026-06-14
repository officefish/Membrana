import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FREE_V1_CATALOG_ID,
  TARIFF_DATASET_COLLECTION_ID,
} from './constants.js';
import type { IStorageBackend } from './ports/storage-backend.js';
import type { NewSampleMeta, SampleLabel } from './types.js';

export interface BundledCatalogManifestEntry {
  id: string;
  path: string;
  class: string;
  label: SampleLabel;
  durationSec: number;
  sampleRate: number;
  source?: string;
  notes?: string | null;
}

export interface BundledCatalogManifest {
  catalogId: string;
  sampleRate: number;
  durationSec: number;
  samples: BundledCatalogManifestEntry[];
}

export const DEFAULT_BUNDLED_CATALOG_MANIFEST_URL = '/catalog/free-v1/manifest.json';

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.versions?.node);
}

/** Resolve manifest for Node (tests, scripts) from repo data path. */
export async function loadBundledCatalogManifestFromRepo(): Promise<BundledCatalogManifest> {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  const path = join(root, 'data', 'detectors-benchmark', 'v0.2', 'manifest.json');
  const raw = JSON.parse(await readFile(path, 'utf8')) as BundledCatalogManifest & {
    version?: number;
  };
  return normalizeManifest(raw);
}

export async function fetchBundledCatalogManifest(
  manifestUrl = DEFAULT_BUNDLED_CATALOG_MANIFEST_URL,
): Promise<BundledCatalogManifest> {
  if (isNodeRuntime() && manifestUrl === DEFAULT_BUNDLED_CATALOG_MANIFEST_URL) {
    try {
      return await loadBundledCatalogManifestFromRepo();
    } catch {
      // fall through to fetch (CI without synced files)
    }
  }
  const res = await fetch(manifestUrl);
  if (!res.ok) {
    throw new Error(`Bundled catalog manifest fetch failed: ${res.status} ${manifestUrl}`);
  }
  const raw = (await res.json()) as BundledCatalogManifest & { version?: number };
  return normalizeManifest(raw);
}

function normalizeManifest(raw: BundledCatalogManifest & { version?: number }): BundledCatalogManifest {
  return {
    catalogId: raw.catalogId ?? FREE_V1_CATALOG_ID,
    sampleRate: raw.sampleRate,
    durationSec: raw.durationSec,
    samples: raw.samples ?? [],
  };
}

export interface BundledCatalogSeedOptions {
  manifestUrl?: string;
  manifest?: BundledCatalogManifest;
  /** Base URL prefix for sample paths (browser: /catalog/free-v1). */
  assetBaseUrl?: string;
  /** Node: absolute directory containing manifest + wav tree. */
  assetRootDir?: string;
}

async function loadSampleBlob(
  entry: BundledCatalogManifestEntry,
  options: BundledCatalogSeedOptions,
): Promise<Blob> {
  if (options.assetRootDir) {
    const fs = await import('node:fs/promises');
    const buf = await fs.readFile(join(options.assetRootDir, entry.path));
    return new Blob([buf], { type: 'audio/wav' });
  }
  if (isNodeRuntime()) {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
    const fs = await import('node:fs/promises');
    const buf = await fs.readFile(join(root, 'data', 'detectors-benchmark', 'v0.2', entry.path));
    return new Blob([buf], { type: 'audio/wav' });
  }
  const base = (options.assetBaseUrl ?? '/catalog/free-v1').replace(/\/$/, '');
  const res = await fetch(`${base}/${entry.path}`);
  if (!res.ok) {
    throw new Error(`Bundled sample fetch failed: ${res.status} ${entry.path}`);
  }
  return await res.blob();
}

/**
 * Seeds read-only tariff dataset collection if empty.
 * Requires backend with `importCatalogSample` (MemoryStorageBackend).
 */
export async function seedBundledCatalogIfEmpty(
  backend: IStorageBackend,
  options: BundledCatalogSeedOptions = {},
): Promise<number> {
  if (!backend.importCatalogSample) {
    return 0;
  }

  const existing = await backend.listSamples(TARIFF_DATASET_COLLECTION_ID);
  if (existing.length > 0) {
    return 0;
  }

  const manifest =
    options.manifest ?? (await fetchBundledCatalogManifest(options.manifestUrl));

  let seeded = 0;
  for (const entry of manifest.samples) {
    const blob = await loadSampleBlob(entry, options);
    const meta: NewSampleMeta = {
      title: entry.id,
      class: entry.class,
      label: entry.label,
      source: 'catalog',
      durationSec: entry.durationSec,
      sampleRate: entry.sampleRate,
      notes: entry.notes ?? undefined,
    };
    await backend.importCatalogSample(TARIFF_DATASET_COLLECTION_ID, blob, meta, entry.id);
    seeded += 1;
  }
  return seeded;
}
