import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN_REFUSAL,
  NOT_FOUND_REFUSAL,
  refusalForOutcome,
  refusalsAreDistinct,
} from '../src/open-api/errors.js';
import { PUBLIC_SAMPLE_FIELDS, PUBLIC_SAMPLE_FIELD_COUNT } from '../src/open-api/fields.js';
import {
  buildLibraryOpenApiDocument,
  ERROR_SCHEMA_NAME,
  PAGE_ENVELOPE_SCHEMA_NAME,
  PUBLIC_SAMPLE_SCHEMA_NAME,
} from '../src/open-api/open-api-document.js';
import {
  hasNextPage,
  isLastPage,
  isShortPage,
  toPageEnvelope,
  validatePageEnvelopeShape,
} from '../src/open-api/page-envelope.js';
import {
  COLLECTIONS_PATH_TEMPLATE,
  FORBIDDEN_PATH_PARAM,
  LIBRARY_PATH_TEMPLATES,
  SAMPLES_PATH_TEMPLATE,
  SAMPLE_BLOB_PATH_TEMPLATE,
  SAMPLE_KEY_PARAM,
  collectionsPath,
  pathTemplateParams,
  sampleBlobPath,
  samplesPath,
} from '../src/open-api/paths.js';
import {
  publicSampleConstantFieldNames,
  toPublicSample,
  validatePublicSampleShape,
} from '../src/open-api/public-sample.js';
import {
  TRACK_KEY_EXPIRES_FIELD,
  TRACK_KEY_FIELD,
  TRACK_KEY_FIELDS,
} from '../src/open-api/temporary-key.js';

/** Выдача для зубов: поле ключа обязательное, поэтому она нужна каждой пробе. */
const grant = stubTrackKeyIssuer();

import {
  internalSample,
  internalSamples,
  stubOwnershipDecision,
  stubPageSlice,
  stubTrackKeyIssuer,
} from './open-api.stubs.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

describe('DoD 1 — сериализатор наружу даёт ровно одиннадцать постоянных полей', () => {
  it('отдаёт одиннадцать имён вердикта и ни одного лишнего', () => {
    const publicSample = toPublicSample(internalSample('sample-1'), grant('sample-1'));

    expect(publicSampleConstantFieldNames(publicSample).sort()).toEqual(
      [
        'id',
        'collectionId',
        'title',
        'class',
        'label',
        'source',
        'durationSec',
        'sampleRate',
        'channels',
        'createdAt',
        'sizeBytes',
      ].sort(),
    );
    expect(PUBLIC_SAMPLE_FIELDS).toHaveLength(PUBLIC_SAMPLE_FIELD_COUNT);
    expect(publicSampleConstantFieldNames(publicSample)).toHaveLength(PUBLIC_SAMPLE_FIELD_COUNT);
    expect(validatePublicSampleShape(publicSample)).toEqual([]);
  });

  it('поля ключа — двенадцатое и тринадцатое, ОБА обязательные', () => {
    // Решение консилиума и владельца 02.09. Прежняя редакция зуба утверждала «двенадцатое и
    // НЕОБЯЗАТЕЛЬНОЕ»; правило изменено РЕШЕНИЕМ, а не подогнано под код.
    const sample = toPublicSample(internalSample('sample-1'), grant('sample-1'));

    expect(TRACK_KEY_FIELD in sample).toBe(true);
    expect(TRACK_KEY_EXPIRES_FIELD in sample).toBe(true);
    expect(publicSampleConstantFieldNames(sample)).toHaveLength(PUBLIC_SAMPLE_FIELD_COUNT);
    expect(Object.keys(sample)).toHaveLength(PUBLIC_SAMPLE_FIELD_COUNT + 2);
    expect(validatePublicSampleShape(sample)).toEqual([]);
  });

  it('ПРОПУСК поля ключа — дефект формы, а не «ключа нет»', () => {
    // Ради этого `?` и снят: отсутствующее поле неотличимо от «не выдан», «квота исчерпана»
    // и «сериализатор забыл». Отказ выдать ключ обязан быть отказом ЗАПРОСА.
    const full = toPublicSample(internalSample('sample-1'), grant('sample-1')) as Record<string, unknown>;

    for (const field of TRACK_KEY_FIELDS) {
      const без = { ...full };
      delete без[field];
      expect(validatePublicSampleShape(без)).toContainEqual({ kind: 'missing-field', field });
    }
  });

  it('снятый срок — законный null, а не пропуск поля', () => {
    const lifted = toPublicSample(internalSample('sample-1'), {
      url: 'https://library.example/k/sample-1/opaque-token',
      expiresAt: null,
    }) as Record<string, unknown>;

    expect(lifted[TRACK_KEY_EXPIRES_FIELD]).toBeNull();
    expect(TRACK_KEY_EXPIRES_FIELD in lifted).toBe(true);
    expect(validatePublicSampleShape(lifted)).toEqual([]);
  });

  it('новое внутреннее поле пробы наружу само не едет — сериализатор allow-list', () => {
    const withExtraInternalField = {
      ...internalSample('sample-1'),
      secretInternalRef: 'shard-7/rack-2',
    };

    const publicSample = toPublicSample(withExtraInternalField, grant('sample-1'));

    expect('secretInternalRef' in publicSample).toBe(false);
    expect(validatePublicSampleShape(publicSample)).toEqual([]);
  });
});

describe('DoD 4 — полнота вычислима читателем на обоих концах', () => {
  it('последняя страница: items.length < limit', () => {
    const all = internalSamples(7);
    const { slice, numbers } = stubPageSlice(all, 2, 5);
    const envelope = toPageEnvelope(slice.map((sample) => toPublicSample(sample, grant(sample.id))), numbers);

    expect(envelope.items).toHaveLength(2);
    expect(isShortPage(envelope)).toBe(true);
    expect(hasNextPage(envelope)).toBe(false);
    expect(isLastPage(envelope)).toBe(true);
  });

  it('есть следующая: items.length === limit && page * limit < total', () => {
    const all = internalSamples(7);
    const { slice, numbers } = stubPageSlice(all, 1, 5);
    const envelope = toPageEnvelope(slice.map((sample) => toPublicSample(sample, grant(sample.id))), numbers);

    expect(envelope.items).toHaveLength(5);
    expect(hasNextPage(envelope)).toBe(true);
    expect(isLastPage(envelope)).toBe(false);
    expect(isShortPage(envelope)).toBe(false);
  });

  it('ровно полная последняя страница — не следующая; короткая страница всегда последняя', () => {
    const all = internalSamples(10);
    const { slice, numbers } = stubPageSlice(all, 2, 5);
    const envelope = toPageEnvelope(slice.map((sample) => toPublicSample(sample, grant(sample.id))), numbers);

    expect(envelope.items).toHaveLength(5);
    expect(isShortPage(envelope)).toBe(false);
    expect(hasNextPage(envelope)).toBe(false);
    expect(isLastPage(envelope)).toBe(true);

    for (let page = 1; page <= 3; page += 1) {
      const shortEnvelope = toPageEnvelope(stubPageSlice(all, page, 4).slice, {
        total: 10,
        page,
        limit: 4,
      });
      if (isShortPage(shortEnvelope)) {
        expect(isLastPage(shortEnvelope)).toBe(true);
      }
    }
  });

  it('читатель считает по разобранному JSON, без наших типов', () => {
    const raw: unknown = JSON.parse(
      JSON.stringify(
        toPageEnvelope(internalSamples(3).map((sample) => toPublicSample(sample, grant(sample.id))), {
          total: 11,
          page: 1,
          limit: 3,
        }),
      ),
    );

    expect(validatePageEnvelopeShape(raw)).toEqual([]);

    const parsed = raw as { items: unknown[]; total: number; page: number; limit: number };
    expect(hasNextPage(parsed)).toBe(true);
    expect(isLastPage(parsed)).toBe(false);
  });

  it('обёртка несёт ровно четыре поля вердикта, без totalPages', () => {
    const envelope = toPageEnvelope([], { total: 0, page: 1, limit: 10 });

    expect(Object.keys(envelope).sort()).toEqual(['items', 'limit', 'page', 'total']);
    expect('totalPages' in envelope).toBe(false);
  });
});

describe('DoD 5 — 404 и 403 разведены', () => {
  it('нет такого — 404; есть, но закрыто — 403', () => {
    const decide = stubOwnershipDecision(new Set(['s-1', 's-2']), new Set(['s-1']));

    expect(decide('s-1')).toBe('allow');
    expect(refusalForOutcome('absent')).toEqual(NOT_FOUND_REFUSAL);
    expect(refusalForOutcome('forbidden')).toEqual(FORBIDDEN_REFUSAL);

    expect(refusalForOutcome(decide('s-2') as 'forbidden').status).toBe(403);
    expect(refusalForOutcome(decide('s-9') as 'absent').status).toBe(404);
  });

  it('коды не слипаются: разный статус И разный код тела', () => {
    expect(refusalsAreDistinct(NOT_FOUND_REFUSAL, FORBIDDEN_REFUSAL)).toBe(true);
    expect(NOT_FOUND_REFUSAL.body.code).toBe('not-found');
    expect(FORBIDDEN_REFUSAL.body.code).toBe('forbidden');
    expect(refusalsAreDistinct(NOT_FOUND_REFUSAL, NOT_FOUND_REFUSAL)).toBe(false);
  });

  it('каждый путь спецификации объявляет ОБА отказа', () => {
    const document = buildLibraryOpenApiDocument();

    for (const template of LIBRARY_PATH_TEMPLATES) {
      const responses = document.paths[template]?.get.responses;
      expect(responses, template).toBeDefined();
      expect(Object.keys(responses ?? {}).sort()).toEqual(['200', '403', '404']);
      expect(responses?.['403']?.description).not.toBe(responses?.['404']?.description);
    }
  });
});

describe('DoD 6 — ключ во всех ссылках sampleId, не title', () => {
  it('шаблоны путей сохраняют внутренние адреса и не знают title', () => {
    expect(LIBRARY_PATH_TEMPLATES).toEqual([
      '/v1/devices/{deviceId}/collections',
      '/v1/devices/{deviceId}/collections/{collectionId}/samples',
      '/v1/devices/{deviceId}/samples/{sampleId}/blob',
    ]);

    const allParams = LIBRARY_PATH_TEMPLATES.flatMap((template) => pathTemplateParams(template));
    expect(allParams).not.toContain(FORBIDDEN_PATH_PARAM);
    expect(pathTemplateParams(SAMPLE_BLOB_PATH_TEMPLATE)).toContain(SAMPLE_KEY_PARAM);
  });

  it('строители адресов берут id пробы, а не заголовок', () => {
    const sample = internalSample('sample-1', { title: 'MakeTrack переименован человеком' });

    const blob = sampleBlobPath('device-9', sample.id);

    expect(blob).toBe('/v1/devices/device-9/samples/sample-1/blob');
    expect(blob).not.toContain('MakeTrack');
    expect(blob).not.toContain(encodeURIComponent(sample.title));
    expect(collectionsPath('device-9')).toBe('/v1/devices/device-9/collections');
    expect(samplesPath('device-9', 'c 1')).toBe('/v1/devices/device-9/collections/c%201/samples');
  });

  it('переименование пробы адреса не двигает', () => {
    const before = internalSample('sample-1', { title: 'первое имя' });
    const after = internalSample('sample-1', { title: 'второе имя' });

    expect(sampleBlobPath('d', before.id)).toBe(sampleBlobPath('d', after.id));
  });
});

describe('Спецификация OpenAPI собрана из тех же констант', () => {
  it('объявляет ровно три чтения и ни одной записи', () => {
    const document = buildLibraryOpenApiDocument();

    const operations = Object.entries(document.paths)
      .flatMap(([path, item]) =>
        HTTP_METHODS.filter(
          (method) => (item as Record<string, unknown>)[method] !== undefined,
        ).map((method) => ({ method, path })),
      )
      .sort((left, right) => left.path.localeCompare(right.path));

    expect(operations).toEqual([
      { method: 'get', path: COLLECTIONS_PATH_TEMPLATE },
      { method: 'get', path: SAMPLES_PATH_TEMPLATE },
      { method: 'get', path: SAMPLE_BLOB_PATH_TEMPLATE },
    ]);
  });

  it('схема пробы — одиннадцать постоянных плюс ДВА обязательных поля ключа', () => {
    // Решение владельца 02.09: 11 + 2, осознанное расширение вердикта M2. Спецификация обязана
    // объявлять поля ключа обязательными — иначе она обещает форму, которой контракт не даёт.
    const schema = buildLibraryOpenApiDocument().components.schemas[PUBLIC_SAMPLE_SCHEMA_NAME];

    expect(schema?.required).toHaveLength(PUBLIC_SAMPLE_FIELD_COUNT + TRACK_KEY_FIELDS.length);
    expect([...(schema?.required ?? [])].sort()).toEqual(
      [...PUBLIC_SAMPLE_FIELDS, ...TRACK_KEY_FIELDS].sort(),
    );
    expect(Object.keys(schema?.properties ?? {}).sort()).toEqual(
      [...PUBLIC_SAMPLE_FIELDS, ...TRACK_KEY_FIELDS].sort(),
    );
    expect(schema?.additionalProperties).toBe(false);
  });

  it('схема обёртки — четыре поля, без флага полноты и без totalPages', () => {
    const schema = buildLibraryOpenApiDocument().components.schemas[PAGE_ENVELOPE_SCHEMA_NAME];

    expect(Object.keys(schema?.properties ?? {}).sort()).toEqual([
      'items',
      'limit',
      'page',
      'total',
    ]);
    expect(schema?.additionalProperties).toBe(false);
  });

  it('ни одна схема документа не объявляет storageRef, notes, hasMore или totalPages', () => {
    const document = buildLibraryOpenApiDocument();

    const declaredProperties = Object.values(document.components.schemas).flatMap((schema) =>
      Object.keys(schema.properties ?? {}),
    );

    for (const forbidden of ['storageRef', 'notes', 'hasMore', 'totalPages']) {
      expect(declaredProperties).not.toContain(forbidden);
    }
    expect(document.components.schemas[ERROR_SCHEMA_NAME]?.required).toEqual(['code', 'message']);
  });
});
