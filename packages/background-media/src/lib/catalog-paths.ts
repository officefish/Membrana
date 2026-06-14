import { join } from 'node:path';

import type { AppConfig } from '../config/env.schema';
import { getPackageRootDir } from './paths';

/** Monorepo root (`packages/background-media` → repo root). */
export function getMonorepoRootDir(): string {
  return join(getPackageRootDir(), '..', '..');
}

/** Directory with `manifest.json` and wav tree for tariff catalog provisioning. */
export function resolveCatalogRoot(config: AppConfig): string {
  if (config.MEDIA_CATALOG_ROOT) {
    return config.MEDIA_CATALOG_ROOT;
  }
  return join(getMonorepoRootDir(), 'data', 'detectors-benchmark', 'v0.2');
}
