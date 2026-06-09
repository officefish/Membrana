/**
 * @membrana/media-library-service — sample library (buffer, collections, storage port).
 * @see docs/MEDIA_LIBRARY_ARCHITECTURE.md
 */

export {
  BUFFER_COLLECTION_ID,
  SYSTEM_BENCHMARK_COLLECTION_ID,
  DEFAULT_LOCAL_QUOTA_BYTES,
  DEFAULT_MAX_BUFFER_SAMPLES,
  DEFAULT_MEDIA_LIBRARY_CONFIG,
  type MediaLibraryConfig,
} from './constants.js';

export type {
  Collection,
  CollectionKind,
  MediaLibrarySnapshot,
  MediaSample,
  NewSampleMeta,
  SampleLabel,
  SampleSource,
  StorageBackendKind,
  StorageQuota,
} from './types.js';

export type { IStorageBackend } from './ports/storage-backend.js';

export {
  MemoryStorageBackend,
  createBrowserLimitedStorageBackend,
  type MemoryStorageBackendOptions,
} from './backends/memory-storage-backend.js';

export {
  MediaLibraryService,
  createMediaLibraryService,
  getDefaultMediaLibraryService,
  resetDefaultMediaLibraryServiceForTests,
} from './media-library-service.js';

export { useMediaLibrary, type UseMediaLibraryResult } from './hooks.js';
