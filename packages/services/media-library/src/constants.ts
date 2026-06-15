/** Fixed collection ids — see docs/MEDIA_LIBRARY_ARCHITECTURE.md */
export const BUFFER_COLLECTION_ID = '__buffer__';
/** Read-only system dataset provisioned per tariff (bundled + server). */
export const TARIFF_DATASET_COLLECTION_ID = '__tariff_dataset__';
export const TARIFF_DATASET_SYSTEM_KEY = 'tariff-dataset' as const;
/** Default catalog for free-v1 tariff (120 × 5s samples). */
export const FREE_V1_CATALOG_ID = 'free-v1-catalog';

export const DEFAULT_LOCAL_QUOTA_BYTES = 100 * 1024 * 1024;
/** Count cap for `__buffer__` — only enforced in browser-limited-fallback (BL1). */
export const DEFAULT_MAX_BUFFER_SAMPLES = 10;
/** Matches `background-media` sample list pagination default. */
export const DEFAULT_SAMPLES_PAGE_SIZE = 40;

export const DEFAULT_MEDIA_LIBRARY_CONFIG = {
  localQuotaBytes: DEFAULT_LOCAL_QUOTA_BYTES,
  maxBufferSamples: DEFAULT_MAX_BUFFER_SAMPLES,
} as const;

export type MediaLibraryConfig = typeof DEFAULT_MEDIA_LIBRARY_CONFIG;
