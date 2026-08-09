export { RegistryIndexError } from './errors';
export type {
  RegistryIndexErrorCode,
  RegistryIndexErrorOptions,
} from './errors';
export {
  createStaticRegistryIndex,
  createStaticRegistryIndexFromLines,
  STATIC_REGISTRY_CANONICAL_PREFIX,
  StaticRegistryIndex,
} from './registry-index';
export type {
  DeepReadonly,
  IndexedRegistryRecord,
  RegistryIndexInput,
  RegistryLineDecoder,
  RegistryLineage,
  RegistryPrimitive,
  RegistryRecordPayload,
  RegistryValue,
} from './types';
export {
  createIndexFromSnapshot,
  toRegistryIndexInput,
  toRegistryIndexInputs,
  type IntegratedEvidencePayload,
} from './adapters/core-static-registry.adapter';
