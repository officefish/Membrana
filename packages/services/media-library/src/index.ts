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
  BufferCleanupExecuteOutcome,
  BufferCleanupPlanOutcome,
  BufferCleanupPlanRequest,
  BufferCleanupPlanRow,
  LibraryChartListPick,
  LibraryChartListRefusal,
  LibraryChartListRequest,
  LibraryChartListRunOutcome,
  SessionDigestRequest,
  SessionDigestSound,
  SessionDigestRunOutcome,
  LibraryDuplicatesRequest,
  LibraryDuplicateRef,
  LibraryDuplicateGroup,
  LibraryDuplicatesRunOutcome,
  Collection,
  CollectionKind,
  MediaLibrarySnapshot,
  MediaSample,
  MediaPluginManifest,
  MediaPluginState,
  NewSampleMeta,
  SampleLabel,
  SampleSource,
  StorageBackendKind,
  StorageQuota,
  UpdateSampleLabelNotes,
  PaginatedSamples,
  ImportBlobOptions,
} from './types.js';

export {
  LABEL_MANIFEST_SCHEMA,
  buildLabelManifest,
  readLabelManifest,
  type BuildLabelManifestInput,
  type LabelManifest,
  type LabelManifestEntry,
  type LabelManifestReadResult,
  type LabelManifestRefusal,
  type LabelManifestRefusalReason,
} from './label-manifest.js';

export {
  DELETION_GATE_CLOSED,
  EVIDENCE_WINDOWS,
  deletionAcknowledgementRisk,
  deletionGateReducer,
  isDeletionBlocked,
  windowByTimeOnly,
  type DeletionGateEvent,
  type DeletionGateState,
  type DeletionRisk,
  assessDeletion,
  assessDeletionValue,
  evidenceWindowOf,
  type DeletionValueContext,
  type DeletionValueLevel,
  type DeletionValueSummary,
  type DeletionValueVerdict,
  type EvidenceWindow,
} from './deletion-value.js';
export {
  LIBRARY_CHART_LIST_CRITERIA,
  LIBRARY_CHART_LIST_VOLUMES,
  dateInputToIsoWindow,
} from './library-chart-list.js';

export {
  BUFFER_CLEANUP_PRINCIPLES,
  BUFFER_CLEANUP_VOLUMES,
  describeCleanupPlan,
  isBufferCleanupVolume,
  isPinnedByHuman,
  planBufferCleanup,
  type BufferCleanupPlan,
  type BufferCleanupPrinciple,
  type BufferCleanupVolume,
  type ProtectedSample,
  type SampleReference,
} from './buffer-cleanup.js';

export { BUFFER_MANAGER_MANIFEST, BUFFER_MANAGER_ID } from './buffer-manager-manifest.js';
export {
  BUFFER_AUTO_CLEANUP_RATIO,
  BUFFER_STOP_RATIO,
  BUFFER_STOP_WARN_RATIO,
  stopDecision,
  stopDecisionOf,
  type BufferFill,
  type BufferPressurePolicy,
  type BufferStopAction,
  type BufferStopVerdict,
} from './buffer-stop.js';

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
  setMediaLibraryTraceHook,
  setMediaLibraryTraceIdProvider,
  resolveMediaLibraryTraceId,
  mediaLibraryTrace,
  type MediaLibraryTraceHook,
} from './media-library-trace.js';

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
  isBufferSampleCountCapActive,
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
