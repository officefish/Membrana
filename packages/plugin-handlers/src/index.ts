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
