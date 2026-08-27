/**
 * `@membrana/plugin-handlers` — handler-плагины первой волны (#1961, M6′).
 * Перечисление поимённо, а не `export *`: наружу — объявленный контракт.
 */
export { FIRST_WAVE_MOUNT_TARGET, firstWaveHandlerManifest, firstWavePluginId } from './manifest.js';
export {
  inputHashOf,
  sha256Hex,
  type CollectionSampleAudio,
  type CollectionSampleDescriptor,
  type CollectionSampleReader,
} from './sample-reader.js';
export { decodeWavMono16, type DecodedMono, type WavDecodeResult } from './wav.js';
export { MFCC_HANDLER_MANIFEST } from './mfcc/manifest.js';
export {
  mfccConfigFromHash,
  mfccPipeSpecOf,
  type MfccGatePreset,
  type MfccRuntimeConfig,
  type MfccStrictness,
} from './mfcc/preset.js';
export { createMeydaExtractor } from './mfcc/meyda-extractor.js';
export {
  MfccRunRefusal,
  createMfccExecutor,
  mfccConfigHashOf,
  mfccFingerprintsOf,
  type MfccExecutorDeps,
  type MfccRunResult,
  type MfccSampleOutcome,
  type MfccSampleVerdict,
} from './mfcc/executor.js';
export {
  summarizeSessionSampleRates,
  type SessionSampleRateConsistency,
  type SessionSampleRateGroup,
  type SessionSampleRateInput,
  type SessionSampleRateStatus,
} from './mfcc/session-sample-rate.js';
export { PluginNotImplementedError, STUB_HANDLER_MANIFESTS, STUB_HANDLER_SLUGS, notImplementedExecutor } from './stubs.js';
export {
  FIRST_WAVE_MANIFESTS,
  registerFirstWave,
  registerReportWave,
  type FirstWaveDeps,
  type FirstWaveResultSink,
  type ReportResultSink,
} from './first-wave.js';
export { UUID_V7_PATTERN, uuidV7, type RandomBytes } from './run-id.js';
export { SESSION_DIGEST_MANIFEST } from './session-digest/manifest.js';
export {
  SESSION_DIGEST_DEFAULTS,
  SESSION_DIGEST_ID,
  createSessionDigestExecutor,
  deviceIdOf,
  sessionDigestFingerprintsOf,
  PROVISIONAL_THRESHOLDS,
  windowOf,
  type ReferenceSound,
  type SessionDigestDeps,
  type SessionDigestResult,
  type SessionDigestTuning,
  type SessionWindow,
} from './session-digest/executor.js';
export {
  dbOverFloor,
  dedupeGreedy,
  findEvents,
  loudnessEnvelope,
  sessionFloor,
  DEFAULT_FLATNESS_CEILING,
  indicesByStructure,
  structureOf,
  type EventFeatures,
  type EventStructure,
  type SessionEvent,
  type SessionRefusal,
} from './session-metrics/index.js';
export {
  selectChartList,
  isChartListCriterion,
  isChartListVolume,
  CHART_LIST_CRITERIA,
  CHART_LIST_DEFAULTS,
  CHART_LIST_VOLUMES,
  filterByDateWindow,
  type ChartListCandidate,
  type ChartListCriterion,
  type ChartListDateWindow,
  type ChartListPick,
  type ChartListRefusal,
  type ChartListRefusalReason,
  type ChartListSelection,
  type ChartListTuning,
  type ChartListVolume,
} from './chart-list/selection.js';
export { CHART_LIST_MANIFEST, CHART_LIST_ID } from './chart-list/manifest.js';
export {
  findDuplicatePairs,
  type DuplicateGroup,
  type DuplicatesRefusal,
  type DuplicatesRefusalReason,
  type DuplicatesReport,
} from './chart-list/duplicates.js';
export {
  createChartListExecutor,
  settingsOf,
  settingsUsable,
  type ChartListDeps,
  type ChartListMeasurePort,
  type ChartListResult,
  type ChartListSettings,
  type ChartListTask,
} from './chart-list/executor.js';
export { CHART_LIST_MEASURE_MANIFEST, CHART_LIST_MEASURE_ID } from './chart-list-measure/manifest.js';
export { LIBRARY_CHART_LIST_MANIFEST, LIBRARY_CHART_LIST_ID } from './chart-list-library/manifest.js';
export { LIBRARY_DUPLICATES_MANIFEST, LIBRARY_DUPLICATES_ID } from './chart-list-duplicates/manifest.js';
export { BUFFER_MANAGER_MANIFEST, BUFFER_MANAGER_ID } from './buffer-manager/manifest.js';
export { runLibraryDuplicates, type LibraryDuplicatesOutcome } from './chart-list-duplicates/executor.js';
export {
  librarySettingsUsable,
  runLibraryChartList,
  type LibraryChartListOutcome,
  type LibraryChartListSettings,
  type LibraryMeasurePort,
  type LibrarySampleRef,
} from './chart-list-library/executor.js';
export {
  measureSampleSet,
  sampleIdsOf,
  CHART_LIST_MEASURE_DEFAULTS,
  type MeasureDeps,
  type MeasureOutcome,
  type MeasureRefusal,
  type MeasureRefusalReason,
  type MeasureTuning,
  type MeasuredCandidate,
} from './chart-list-measure/executor.js';
