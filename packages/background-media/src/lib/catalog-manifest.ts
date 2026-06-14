import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { SampleLabel } from '../prisma/client';
import { FREE_V1_CATALOG_ID } from './catalog-ids';

export interface CatalogManifestEntry {
  id: string;
  path: string;
  class: string;
  label: SampleLabel;
  durationSec: number;
  sampleRate: number;
  source?: string;
  notes?: string | null;
}

export interface CatalogManifest {
  catalogId: string;
  sampleRate: number;
  durationSec: number;
  samples: CatalogManifestEntry[];
}

export async function loadCatalogManifest(catalogRoot: string): Promise<CatalogManifest> {
  const raw = JSON.parse(
    await readFile(join(catalogRoot, 'manifest.json'), 'utf8'),
  ) as CatalogManifest & { version?: number; samples?: CatalogManifestEntry[] };

  return {
    catalogId: raw.catalogId ?? FREE_V1_CATALOG_ID,
    sampleRate: raw.sampleRate,
    durationSec: raw.durationSec,
    samples: raw.samples ?? [],
  };
}
