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
