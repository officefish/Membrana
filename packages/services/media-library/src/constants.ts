/** Fixed collection ids — see docs/MEDIA_LIBRARY_ARCHITECTURE.md */
export const BUFFER_COLLECTION_ID = '__buffer__';
export const SYSTEM_BENCHMARK_COLLECTION_ID = '__system_benchmark__';

export const DEFAULT_LOCAL_QUOTA_BYTES = 100 * 1024 * 1024;
export const DEFAULT_MAX_BUFFER_SAMPLES = 10;

export const DEFAULT_MEDIA_LIBRARY_CONFIG = {
  localQuotaBytes: DEFAULT_LOCAL_QUOTA_BYTES,
  maxBufferSamples: DEFAULT_MAX_BUFFER_SAMPLES,
} as const;

export type MediaLibraryConfig = typeof DEFAULT_MEDIA_LIBRARY_CONFIG;
