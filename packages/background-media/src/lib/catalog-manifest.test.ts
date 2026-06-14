import { describe, expect, it } from 'vitest';

import { FREE_V1_CATALOG_ID } from './catalog-ids';
import { loadCatalogManifest } from './catalog-manifest';
import { resolveCatalogRoot } from './catalog-paths';
import type { AppConfig } from '../config/env.schema';

const baseConfig = {
  PORT: 3010,
  NODE_ENV: 'test' as const,
  LOG_LEVEL: 'info' as const,
  API_INTERNAL_TOKEN: 'test',
  DATABASE_URL: 'postgresql://localhost/test',
  MEDIA_BLOB_DIR: './data/blobs',
  MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 1_073_741_824,
  MEDIA_DEFAULT_DATASET_CATALOG_ID: FREE_V1_CATALOG_ID,
  MAX_UPLOAD_BYTES: 52_428_800,
  MEDIA_ALLOWED_MIME: ['audio/wav'],
  SWAGGER_ENABLED: false,
  CLIENT_CORS_ORIGINS: [],
  MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_073_741_824,
} satisfies AppConfig;

describe('catalog manifest', () => {
  it('loads free-v1 manifest from repo v0.2', async () => {
    const root = resolveCatalogRoot(baseConfig);
    const manifest = await loadCatalogManifest(root);
    expect(manifest.catalogId).toBe(FREE_V1_CATALOG_ID);
    expect(manifest.samples.length).toBe(120);
  });

  it('resolveCatalogRoot honors MEDIA_CATALOG_ROOT override', () => {
    const root = resolveCatalogRoot({
      ...baseConfig,
      MEDIA_CATALOG_ROOT: '/custom/catalog',
    });
    expect(root).toBe('/custom/catalog');
  });
});
