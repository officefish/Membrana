export {
  DEFAULT_LIVE_JOURNAL_CONFIG,
  DEFAULT_LIVE_JOURNAL_MAX_ITEMS,
  DEFAULT_LIVE_JOURNAL_STORAGE_MODE,
  LIVE_JOURNAL_CLEAR_TAG,
  LIVE_JOURNAL_DETECTION_TAG,
  LIVE_JOURNAL_MODULE_NAME,
  LIVE_JOURNAL_REPORT_TAGS,
  LIVE_JOURNAL_TRACK_TAGS,
  type LiveJournalConfig,
} from './constants.js';

export {
  LIVE_JOURNAL_PAGE_SIZE,
  countLiveJournalPages,
  decodeLiveJournalCursor,
  encodeLiveJournalCursor,
  isLiveJournalItemBeforeCursor,
  matchesLiveJournalSearch,
  paginateLiveJournalItems,
  sliceLiveJournalPage,
  type LiveJournalCursor,
  type PaginateLiveJournalItemsOptions,
  type PaginatedLiveJournalItems,
} from './pagination.js';

export {
  TELEMETRY_TRACK_SCHEMA_VERSION,
  type AppendLiveJournalReportInput,
  type AppendLiveJournalTrackInput,
  type LiveJournalFilter,
  type LiveJournalItem,
  type LiveJournalItemKind,
  type LiveJournalReportPayload,
  type LiveJournalSnapshot,
  type LiveJournalStorageMode,
  type LiveJournalTrackPayload,
  type TelemetryTrackSchemaVersion,
} from './types.js';

export type { IJournalStorageBackend } from './ports/storage-backend.js';

export {
  MemoryJournalStorageBackend,
  assertLiveJournalReportPayload,
  assertLiveJournalTrackPayload,
  createMemoryJournalStorageBackend,
  liveJournalReportClientEntryId,
  liveJournalTrackClientEntryId,
} from './backends/memory-journal-storage-backend.js';

export {
  countLiveJournalFilters,
  findReportsForTrack,
  findTrackForReport,
  isLiveJournalDetection,
  matchesLiveJournalFilter,
} from './filters.js';

export {
  LiveJournalService,
  configureDefaultLiveJournalService,
  createLiveJournalService,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
  setDefaultLiveJournalServiceForTests,
} from './live-journal-service.js';

export type {
  CabinetTelemetryLiveRecordDto,
  CabinetTelemetryReportDto,
  CreateCabinetTelemetryLiveRecordInput,
  CreateCabinetTelemetryReportInput,
  DeleteCabinetJournalItemsQuery,
  ICabinetJournalPort,
  ListCabinetJournalItemsQuery,
  PaginatedCabinetJournalItems,
} from './ports/cabinet-journal-port.js';

export {
  cabinetRowsToJournalItems,
  isLiveJournalReportRow,
  isTelemetryTrackLiveRecord,
  liveRecordToJournalItem,
  reportInputToCabinetReport,
  reportToJournalItem,
  trackInputToCabinetLiveRecord,
} from './mappers/cabinet-journal-mapper.js';

export { liveJournalItemFromJournalAppendPayload } from './mappers/realtime-journal-mapper.js';

export {
  SyncJournalStorageBackend,
  createSyncJournalStorageBackend,
  type IRealtimeJournalPushPort,
  type SyncJournalStorageBackendOptions,
} from './backends/sync-journal-storage-backend.js';

export {
  ElectronJournalStorageBackend,
  createElectronJournalStorageBackend,
} from './backends/electron-journal-storage-backend.js';
export type { IElectronJournalStoragePort } from './ports/electron-journal-port.js';

export { useLiveJournal, type UseLiveJournalResult } from './hooks.js';

export {
  JOURNAL_LOCAL_CACHE_PREFIX,
  clearJournalLocalCache,
  journalLocalCacheKey,
  readJournalLocalCache,
  writeJournalLocalCache,
} from './journal-local-cache.js';
