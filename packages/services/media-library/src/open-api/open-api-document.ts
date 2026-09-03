import { PUBLIC_SAMPLE_FIELDS, type PublicSampleField } from './fields.js';
import { LIBRARY_ERROR_CODES } from './errors.js';
import { PAGE_ENVELOPE_FIELDS } from './page-envelope.js';
import {
  COLLECTIONS_PATH_TEMPLATE,
  SAMPLES_PATH_TEMPLATE,
  SAMPLE_BLOB_PATH_TEMPLATE,
} from './paths.js';
import { TRACK_KEY_EXPIRES_FIELD, TRACK_KEY_FIELD, TRACK_KEY_FIELDS } from './temporary-key.js';

/**
 * Спецификация открытого API библиотеки (OpenAPI 3.1), собранная из тех же констант, что и
 * сериализатор. Пакет `@membrana/media-library-service` Nest-зависимостей не имеет, поэтому
 * документ — обычный объект, а не побочный продукт декораторов.
 */

export interface JsonSchema {
  /**
   * Массив допускается ради `['string','null']` — законная форма OpenAPI 3.1 и единственный
   * честный способ сказать «строка ИЛИ снятый срок». Флаг `nullable` из 3.0 сюда не заводим:
   * это вторая правда о том же, а тип и флаг умеют разойтись.
   */
  type?: string | readonly string[];
  format?: string;
  description?: string;
  enum?: readonly (string | number)[];
  items?: JsonSchema | { $ref: string };
  properties?: Record<string, JsonSchema | { $ref: string }>;
  required?: readonly string[];
  additionalProperties?: boolean;
  minimum?: number;
  maximum?: number;
  default?: number;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<string, { schema: JsonSchema | { $ref: string } }>;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  schema: JsonSchema;
  description?: string;
}

export interface OpenApiOperation {
  operationId: string;
  summary: string;
  parameters: OpenApiParameter[];
  responses: Record<string, OpenApiResponse>;
}

export interface OpenApiPathItem {
  get: OpenApiOperation;
}

export interface LibraryOpenApiDocument {
  openapi: '3.1.0';
  info: { title: string; version: string; description: string };
  paths: Record<string, OpenApiPathItem>;
  components: { schemas: Record<string, JsonSchema> };
}

export const OPEN_API_VERSION = '3.1.0';
export const PUBLIC_SAMPLE_SCHEMA_NAME = 'PublicSample';
export const PAGE_ENVELOPE_SCHEMA_NAME = 'PublicSamplePage';
export const ERROR_SCHEMA_NAME = 'LibraryError';
export const COLLECTION_SCHEMA_NAME = 'PublicCollection';

/**
 * Схемы одиннадцати постоянных полей. `Record` по объединению имён — компилятор не даст
 * забыть поле и не даст добавить лишнее.
 */
const CONSTANT_FIELD_SCHEMAS: Record<PublicSampleField, JsonSchema> = {
  id: { type: 'string', format: 'uuid', description: 'Неизменный ключ пробы.' },
  collectionId: { type: 'string', description: 'Набор, в котором лежит проба.' },
  title: { type: 'string', description: 'Заголовок; изменяем, ключом не является.' },
  class: { type: 'string' },
  label: { type: 'string', enum: ['drone', 'not-drone', 'unlabeled'] },
  source: {
    type: 'string',
    enum: ['mic-recording', 'disk-import', 'synthetic', 'move', 'copy', 'catalog'],
  },
  durationSec: { type: 'number', minimum: 0 },
  sampleRate: { type: 'integer', minimum: 1 },
  channels: { type: 'integer', enum: [1, 2] },
  createdAt: { type: 'string', format: 'date-time' },
  sizeBytes: { type: 'integer', minimum: 0 },
};

function publicSampleSchema(): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  for (const field of PUBLIC_SAMPLE_FIELDS) {
    properties[field] = CONSTANT_FIELD_SCHEMAS[field];
  }
  properties[TRACK_KEY_FIELD] = {
    type: 'string',
    description:
      'Предъявительский URL: партнёр идёт по нему анонимно. Поштучного отзыва у него нет ' +
      'по конструкции — гасится только ротацией ключа мембраны, разом со всеми ссылками.',
  };
  properties[TRACK_KEY_EXPIRES_FIELD] = {
    type: ['string', 'null'],
    format: 'date-time',
    description:
      'Когда ссылка умрёт (ISO-8601 UTC). null — срок СНЯТ человеком с подписью; это ' +
      'единственный источник null. Отдельным полем, а не внутри строки запроса: читатель ' +
      'обязан мочь вычислить срок сам — та же логика, которой отвергнут hasMore.',
  };
  return {
    type: 'object',
    description:
      'Проба наружу: одиннадцать постоянных полей плюс два поля ключа, все обязательные. ' +
      'storageRef и notes наружу не едут. Одиннадцать + два — осознанное расширение ' +
      'вердикта M2 решением владельца 02.09, а не умолчание сборки.',
    properties,
    required: [...PUBLIC_SAMPLE_FIELDS, ...TRACK_KEY_FIELDS],
    additionalProperties: false,
  };
}

function pageEnvelopeSchema(): JsonSchema {
  return {
    type: 'object',
    description:
      'Обёртка списка. Флага полноты нет намеренно: читатель вычисляет её сам — ' +
      'items.length < limit → страница последняя; ' +
      'items.length === limit && page * limit < total → есть следующая.',
    properties: {
      items: { type: 'array', items: { $ref: `#/components/schemas/${PUBLIC_SAMPLE_SCHEMA_NAME}` } },
      total: { type: 'integer', minimum: 0, description: 'Размер всего множества после фильтров.' },
      page: { type: 'integer', minimum: 1, description: '1-based.' },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
    required: [...PAGE_ENVELOPE_FIELDS],
    additionalProperties: false,
  };
}

function errorSchema(): JsonSchema {
  return {
    type: 'object',
    properties: {
      code: { type: 'string', enum: [...LIBRARY_ERROR_CODES] },
      message: { type: 'string' },
    },
    required: ['code', 'message'],
    additionalProperties: false,
  };
}

function collectionSchema(): JsonSchema {
  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      kind: { type: 'string', enum: ['buffer', 'user', 'system'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'kind', 'createdAt'],
    additionalProperties: false,
  };
}

const NOT_FOUND_RESPONSE: OpenApiResponse = {
  description: 'Нет такого. Ресурса с этим идентификатором не существует.',
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ERROR_SCHEMA_NAME}` } } },
};

const FORBIDDEN_RESPONSE: OpenApiResponse = {
  description: 'Есть, но закрыто. Ресурс существует и не принадлежит этому предъявителю.',
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ERROR_SCHEMA_NAME}` } } },
};

const DEVICE_PARAM: OpenApiParameter = {
  name: 'deviceId',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Технический ключ прибора (адресация, не ось владения).',
};

const COLLECTION_PARAM: OpenApiParameter = {
  name: 'collectionId',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Группировка (не ось владения).',
};

const SAMPLE_PARAM: OpenApiParameter = {
  name: 'sampleId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description: 'Ключ пробы. Изменяемый title ключом быть не может.',
};

const PAGE_PARAM: OpenApiParameter = {
  name: 'page',
  in: 'query',
  required: false,
  schema: { type: 'integer', minimum: 1, default: 1 },
};

const LIMIT_PARAM: OpenApiParameter = {
  name: 'limit',
  in: 'query',
  required: false,
  schema: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
};

/** Собрать документ. Чистая функция: одинаковый вход — одинаковый выход, времени не знает. */
export function buildLibraryOpenApiDocument(): LibraryOpenApiDocument {
  return {
    openapi: OPEN_API_VERSION,
    info: {
      title: 'Открытое API библиотеки',
      version: '1',
      description:
        'Форма контракта наружу по вердикту M2 заседания library-open-api. ' +
        'Тело со списком является связкой ключей, а не метаданными каталога.',
    },
    paths: {
      [COLLECTIONS_PATH_TEMPLATE]: {
        get: {
          operationId: 'listDeviceCollections',
          summary: 'Наборы прибора.',
          parameters: [DEVICE_PARAM],
          responses: {
            '200': {
              description: 'Наборы.',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${COLLECTION_SCHEMA_NAME}` },
                  },
                },
              },
            },
            '403': FORBIDDEN_RESPONSE,
            '404': NOT_FOUND_RESPONSE,
          },
        },
      },
      [SAMPLES_PATH_TEMPLATE]: {
        get: {
          operationId: 'listCollectionSamples',
          summary: 'Пробы набора страницей.',
          parameters: [DEVICE_PARAM, COLLECTION_PARAM, PAGE_PARAM, LIMIT_PARAM],
          responses: {
            '200': {
              description: 'Страница проб.',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${PAGE_ENVELOPE_SCHEMA_NAME}` },
                },
              },
            },
            '403': FORBIDDEN_RESPONSE,
            '404': NOT_FOUND_RESPONSE,
          },
        },
      },
      [SAMPLE_BLOB_PATH_TEMPLATE]: {
        get: {
          operationId: 'getSampleBlob',
          summary: 'Тело пробы по ключу пробы.',
          parameters: [DEVICE_PARAM, SAMPLE_PARAM],
          responses: {
            '200': {
              description: 'Тело пробы.',
              content: {
                'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
              },
            },
            '403': FORBIDDEN_RESPONSE,
            '404': NOT_FOUND_RESPONSE,
          },
        },
      },
    },
    components: {
      schemas: {
        [PUBLIC_SAMPLE_SCHEMA_NAME]: publicSampleSchema(),
        [PAGE_ENVELOPE_SCHEMA_NAME]: pageEnvelopeSchema(),
        [ERROR_SCHEMA_NAME]: errorSchema(),
        [COLLECTION_SCHEMA_NAME]: collectionSchema(),
      },
    },
  };
}
