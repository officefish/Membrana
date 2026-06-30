/**
 * @membrana/media-library-service — sample library (buffer, collections, storage port).
 * @see docs/MEDIA_LIBRARY_ARCHITECTURE.md
 */

export {
  BUFFER_COLLECTION_ID,
  TARIFF_DATASET_COLLECTION_ID,
  TARIFF_DATASET_SYSTEM_KEY,
  FREE_V1_CATALOG_ID,
  DEFAULT_LOCAL_QUOTA_BYTES,
  DEFAULT_MAX_BUFFER_SAMPLES,
  DEFAULT_MEDIA_LIBRARY_CONFIG,
  DEFAULT_SAMPLES_PAGE_SIZE,
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
  UpdateSampleLabelNotes,
  PaginatedSamples,
} from './types.js';

export type { IStorageBackend } from './ports/storage-backend.js';
export type { IElectronMediaLibraryPort } from './ports/electron-media-library-port.js';

export {
  MemoryStorageBackend,
  createBrowserLimitedStorageBackend,
  type MemoryStorageBackendOptions,
} from './backends/memory-storage-backend.js';

export {
  ElectronFsStorageBackend,
  createElectronFsStorageBackend,
} from './backends/electron-fs-storage-backend.js';

export {
  ServerStorageBackend,
  createServerStorageBackend,
  type ServerStorageBackendConfig,
} from './backends/server-storage-backend.js';

export {
  MediaLibraryService,
  createMediaLibraryService,
  configureDefaultMediaLibraryService,
  getDefaultMediaLibraryService,
  resetDefaultMediaLibraryServiceForTests,
  setDefaultMediaLibraryServiceForTests,
} from './media-library-service.js';

export { useMediaLibrary, type UseMediaLibraryResult } from './hooks.js';

export {
  QUOTA_WARNING_RATIO,
  getBufferQuotaLevel,
  getQuotaLevel,
  isBufferQuotaFull,
  isBufferRecordingBlocked,
  isQuotaFull,
  isQuotaWarning,
  resolveBufferQuota,
  resolveMediaLibraryStorageMode,
  type MediaLibraryStorageMode,
  type QuotaLevel,
} from './quota-status.js';

export {
  DEFAULT_BUNDLED_CATALOG_MANIFEST_URL,
  fetchBundledCatalogManifest,
  loadBundledCatalogManifestFromRepo,
  seedBundledCatalogIfEmpty,
  type BundledCatalogManifest,
  type BundledCatalogManifestEntry,
  type BundledCatalogSeedOptions,
} from './bundled-catalog.js';

export {
  SAMPLE_LABEL_OPTIONS,
  sampleLabelBadgeClass,
  sampleLabelFromStorage,
  sampleLabelTitle,
} from './sample-label-display.js';

export {
  MEDIA_LIBRARY_HUB,
  type MediaLibraryCaptureCancelPayload,
  type MediaLibraryCaptureFormat,
  type MediaLibraryCaptureStartPayload,
  type MediaLibraryCaptureStopPayload,
  type MediaLibraryCaptureStopReason,
  type MediaLibraryHubEventName,
  type MediaLibraryQuotaUpdatedPayload,
  type MediaLibraryRecordingMode,
  type MediaLibrarySampleImportedPayload,
} from './hub-events.js';
