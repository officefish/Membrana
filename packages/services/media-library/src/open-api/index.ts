/**
 * Форма контракта наружу — блок `contract` коворка `cowork-library-open-api`.
 *
 * Барель блока. Общая точка пакета (`src/index.ts`) остаётся integration-owned: экспорты
 * наружу вносит координатор на интеграции.
 */

export {
  PUBLIC_SAMPLE_FIELDS,
  PUBLIC_SAMPLE_FIELD_COUNT,
  FORBIDDEN_SAMPLE_FIELDS,
  type PublicSampleField,
  type ForbiddenSampleField,
} from './fields.js';

export {
  TRACK_KEY_EXPIRES_FIELD,
  TRACK_KEY_FIELD,
  TRACK_KEY_FIELDS,
  type TrackKeyField,
  type TrackKeyGrant,
} from './temporary-key.js';

export { isPlainObject, type ShapeViolation, type ShapeViolationKind } from './shape-violation.js';

export {
  toPublicSample,
  validatePublicSampleShape,
  publicSampleConstantFieldNames,
  forbiddenFieldsIn,
  type PublicSample,
  type PublicSampleConstantFields,
} from './public-sample.js';

export {
  PAGE_ENVELOPE_FIELDS,
  COMPLETENESS_FLAG_FIELDS,
  toPageEnvelope,
  validatePageEnvelopeShape,
  hasNextPage,
  isShortPage,
  isLastPage,
  type PageEnvelope,
  type PageEnvelopeField,
  type CompletenessFlagField,
  type CompletenessInput,
  type PageNumbers,
} from './page-envelope.js';

export {
  ACCESS_OUTCOMES,
  LIBRARY_ERROR_CODES,
  NOT_FOUND_REFUSAL,
  FORBIDDEN_REFUSAL,
  refusalForOutcome,
  refusalsAreDistinct,
  type AccessOutcome,
  type LibraryErrorBody,
  type LibraryErrorCode,
  type LibraryRefusal,
} from './errors.js';

export {
  SAMPLE_KEY_PARAM,
  FORBIDDEN_PATH_PARAM,
  COLLECTIONS_PATH_TEMPLATE,
  SAMPLES_PATH_TEMPLATE,
  SAMPLE_BLOB_PATH_TEMPLATE,
  LIBRARY_PATH_TEMPLATES,
  collectionsPath,
  samplesPath,
  sampleBlobPath,
  pathTemplateParams,
  type LibraryPathTemplate,
} from './paths.js';

export {
  buildLibraryOpenApiDocument,
  OPEN_API_VERSION,
  PUBLIC_SAMPLE_SCHEMA_NAME,
  PAGE_ENVELOPE_SCHEMA_NAME,
  ERROR_SCHEMA_NAME,
  COLLECTION_SCHEMA_NAME,
  type LibraryOpenApiDocument,
  type JsonSchema,
  type OpenApiOperation,
  type OpenApiParameter,
  type OpenApiPathItem,
  type OpenApiResponse,
} from './open-api-document.js';
