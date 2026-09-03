/**
 * Порча — зубы на СОБСТВЕННЫЙ код блока.
 *
 * Обычный зуб проверяет, что правильный выход правилен. Порча проверяет обратное и более
 * важное: что зуб КРАСНЕЕТ, если правило нарушить. Без неё «наружу не едут storageRef и
 * notes» и «флага hasMore нет» остаются описанием, а не проверяемым свойством.
 *
 * Приём: рядом с настоящим сериализатором живёт его испорченная копия. Порча гоняется через
 * тот же валидатор, что и настоящий выход, и обязана дать нарушение.
 */

import { describe, expect, it } from 'vitest';

import {
  COMPLETENESS_FLAG_FIELDS,
  hasNextPage,
  isLastPage,
  toPageEnvelope,
  validatePageEnvelopeShape,
} from '../src/open-api/page-envelope.js';
import {
  forbiddenFieldsIn,
  toPublicSample,
  validatePublicSampleShape,
} from '../src/open-api/public-sample.js';
import type { MediaSample } from '../src/types.js';

import { internalSample, internalSamples, stubTrackKeyIssuer } from './open-api.stubs.js';

/** Выдача для зубов: поле ключа обязательное, поэтому она нужна каждой пробе. */
const grant = stubTrackKeyIssuer();

/** ПОРЧА: сериализатор, который «заодно» отдаёт внутренний путь хранилища. */
function corruptedSerializerWithStorageRef(sample: MediaSample): Record<string, unknown> {
  return { ...toPublicSample(sample, grant(sample.id)), storageRef: sample.storageRef };
}

/** ПОРЧА: сериализатор, который «заодно» отдаёт пометки человека. */
function corruptedSerializerWithNotes(sample: MediaSample): Record<string, unknown> {
  return { ...toPublicSample(sample, grant(sample.id)), notes: sample.notes };
}

/** ПОРЧА: обёртка, в которую завели флаг полноты. */
function corruptedEnvelopeWithHasMore<T>(
  items: readonly T[],
  total: number,
  page: number,
  limit: number,
): Record<string, unknown> {
  return { ...toPageEnvelope(items, { total, page, limit }), hasMore: page * limit < total };
}

describe('DoD 2 — порча: storageRef или notes в выдаче красит зуб', () => {
  it('настоящий сериализатор чист даже на пробе со всеми внутренними полями', () => {
    const internal = internalSample('sample-1');

    expect(internal.storageRef).toBeTruthy();
    expect(internal.notes).toBeTruthy();
    expect(forbiddenFieldsIn(toPublicSample(internal, grant(internal.id)))).toEqual([]);
    expect(validatePublicSampleShape(toPublicSample(internal, grant(internal.id)))).toEqual([]);
  });

  it('порча storageRef — валидатор называет forbidden-field', () => {
    const corrupted = corruptedSerializerWithStorageRef(internalSample('sample-1'));

    const violations = validatePublicSampleShape(corrupted);

    expect(violations).toContainEqual(
      expect.objectContaining({ kind: 'forbidden-field', field: 'storageRef' }),
    );
    expect(forbiddenFieldsIn(corrupted)).toEqual(['storageRef']);
  });

  it('порча notes — валидатор называет forbidden-field', () => {
    const corrupted = corruptedSerializerWithNotes(internalSample('sample-1'));

    expect(validatePublicSampleShape(corrupted)).toContainEqual(
      expect.objectContaining({ kind: 'forbidden-field', field: 'notes' }),
    );
    expect(forbiddenFieldsIn(corrupted)).toEqual(['notes']);
  });

  it('порча обоими полями сразу — оба названы, ни одно не проглочено', () => {
    const corrupted = {
      ...corruptedSerializerWithStorageRef(internalSample('sample-1')),
      notes: 'пометка человека',
    };

    expect(forbiddenFieldsIn(corrupted).sort()).toEqual(['notes', 'storageRef']);
    expect(
      validatePublicSampleShape(corrupted).filter((violation) => violation.kind === 'forbidden-field'),
    ).toHaveLength(2);
  });

  it('порча посторонним полем — unknown-field, а не молчание', () => {
    const corrupted = { ...toPublicSample(internalSample('sample-1'), grant('sample-1')), membraneId: 'm-1' };

    expect(validatePublicSampleShape(corrupted)).toContainEqual(
      expect.objectContaining({ kind: 'unknown-field', field: 'membraneId' }),
    );
  });

  it('порча удалением — missing-field: одиннадцать полей обязательны', () => {
    const corrupted: Record<string, unknown> = { ...toPublicSample(internalSample('sample-1'), grant('sample-1')) };
    delete corrupted['sizeBytes'];

    expect(validatePublicSampleShape(corrupted)).toContainEqual(
      expect.objectContaining({ kind: 'missing-field', field: 'sizeBytes' }),
    );
  });
});

describe('DoD 3 — порча: флаг hasMore красит зуб', () => {
  it('настоящая обёртка чиста', () => {
    const envelope = toPageEnvelope(internalSamples(3).map((s) => toPublicSample(s, grant(s.id))), {
      total: 11,
      page: 1,
      limit: 3,
    });

    expect(validatePageEnvelopeShape(envelope)).toEqual([]);
  });

  it('порча hasMore — валидатор называет completeness-flag', () => {
    const corrupted = corruptedEnvelopeWithHasMore(internalSamples(3), 11, 1, 3);

    expect(validatePageEnvelopeShape(corrupted)).toContainEqual(
      expect.objectContaining({ kind: 'completeness-flag', field: 'hasMore' }),
    );
  });

  it('любое из имён флага полноты отвергается — не только hasMore', () => {
    for (const flag of COMPLETENESS_FLAG_FIELDS) {
      const corrupted = { ...toPageEnvelope([], { total: 0, page: 1, limit: 10 }), [flag]: true };

      expect(validatePageEnvelopeShape(corrupted), flag).toContainEqual(
        expect.objectContaining({ kind: 'completeness-flag', field: flag }),
      );
    }
  });

  it('порча totalPages — unknown-field: производное число наружу не едет', () => {
    const corrupted = { ...toPageEnvelope([], { total: 20, page: 1, limit: 10 }), totalPages: 2 };

    expect(validatePageEnvelopeShape(corrupted)).toContainEqual(
      expect.objectContaining({ kind: 'unknown-field', field: 'totalPages' }),
    );
  });

  it('вот почему флага нет: он способен разойтись с числами, а инвариант — нет', () => {
    const corrupted = corruptedEnvelopeWithHasMore(internalSamples(3), 11, 1, 3);
    const lying = { ...corrupted, hasMore: false };

    // Флаг говорит «больше нет», числа говорят обратное — читатель, поверивший флагу, потерял
    // восемь проб. Инвариант, посчитанный из тех же чисел, разойтись с ними не может.
    expect(lying['hasMore']).toBe(false);
    expect(hasNextPage(lying as never)).toBe(true);
    expect(isLastPage(lying as never)).toBe(false);
    expect(validatePageEnvelopeShape(lying)).toContainEqual(
      expect.objectContaining({ kind: 'completeness-flag' }),
    );
  });
});
