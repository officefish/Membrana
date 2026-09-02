/**
 * ИНТЕГРАЦИОННЫЙ SMOKE коворка `cowork-library-open-api` — Phase 4.
 *
 * Один сценарий, проходящий через ВСЕ три шва на настоящем коде блоков: ось владения
 * (`ownership`) → форма наружу (`contract`) → срок и ключ (`key-ttl`). Стабов соседей здесь
 * нет: у каждого блока они были СВОИ и в изоляции; смысл этого файла ровно в том, чтобы
 * блоки впервые встретились друг с другом, а не со своими представлениями друг о друге.
 *
 * Хранилище и часы остаются подставными — это внешний мир, а не сосед по коворку.
 *
 * Сценарий и его пункты — из `INTERFACE_CONTRACT.md`, раздел 6.
 */
import { describe, expect, it } from 'vitest';

import {
  TRACK_KEY_EXPIRES_FIELD,
  TRACK_KEY_FIELD,
  forbiddenFieldsIn,
  hasNextPage,
  isLastPage,
  refusalForOutcome,
  validatePageEnvelopeShape,
  toPageEnvelope,
  validatePublicSampleShape,
  type MediaSample,
} from '@membrana/media-library-service';

import { LibraryOwnershipService } from '../library-ownership/library-ownership.service.js';
import { MembraneOwnerRequiredError } from '../library-ownership/ownership-errors.js';
import type {
  OwnershipPageRequest,
  OwnershipSampleReader,
  OwnershipSampleRow,
} from '../library-ownership/ownership-sample-reader.js';

import {
  CREDENTIAL_BEARING_HEADERS,
  OWNER_ABSENT_STATUS,
  envelopeFromOwnedPage,
  ownerAbsentResponse,
} from './library-open-api.adapters.js';

const MEMBRANE = '00000000-0000-4000-8000-0000000000aa';
const DEVICE_WITH = { id: 'dev-with', membraneId: MEMBRANE };
const DEVICE_WITHOUT = { id: 'dev-without', membraneId: null };

/** Внешний мир: хранилище. Не сосед по коворку — подставлять его законно. */
class FakeReader implements OwnershipSampleReader {
  calls = 0;

  constructor(private readonly rows: readonly OwnershipSampleRow[]) {}

  async count(): Promise<number> {
    this.calls += 1;
    return this.rows.length;
  }

  async findPage(
    _filter: unknown,
    page: OwnershipPageRequest,
  ): Promise<readonly OwnershipSampleRow[]> {
    this.calls += 1;
    return this.rows.slice(page.skip, page.skip + page.take);
  }
}

function rows(n: number): OwnershipSampleRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `sample-${i + 1}`,
    deviceId: DEVICE_WITH.id,
    collectionId: 'col-night',
    createdAt: new Date(Date.UTC(2026, 7, 23, 18, i)),
  }));
}

/** Внутренняя проба библиотеки — то, из чего форма собирает наружную. */
function internal(id: string): MediaSample {
  return {
    id,
    collectionId: 'col-night',
    title: `MakeTrack ${id}`,
    class: 'buffer',
    label: 'unlabeled',
    source: 'mic-recording',
    durationSec: 5,
    sampleRate: 48_000,
    channels: 1,
    createdAt: '2026-08-23T18:24:03.788Z',
    storageRef: 'shard-7/rack-2/ref.wav',
    sizeBytes: 460_000,
    notes: 'пометка человека, наружу не едет',
  };
}

/** Выдача ключа: адрес собирает вызывающий, срок приходит от `key-ttl`. */
const grantFor = (id: string) => ({
  url: `https://library.example/k/${id}/opaque`,
  expiresAt: '2026-09-02T12:15:00.000Z',
});

describe('smoke швов: ось владения → форма наружу → ключ и срок', () => {
  it('1–2. прибор С мембраной: страница из 11+2 полей, срок подставлен, внутренние поля не поехали', async () => {
    const reader = new FakeReader(rows(3));
    const service = new LibraryOwnershipService(reader);

    const page = await service.listOwnedSamples(DEVICE_WITH, { page: 1, limit: 100 });
    const envelope = envelopeFromOwnedPage(page, (row) => {
      const grant = grantFor(row.id);
      return {
        ...Object.fromEntries(
          Object.entries(internal(row.id)).filter(([k]) => k !== 'storageRef' && k !== 'notes'),
        ),
        [TRACK_KEY_FIELD]: grant.url,
        [TRACK_KEY_EXPIRES_FIELD]: grant.expiresAt,
      } as never;
    }, toPageEnvelope);

    expect(page.scope).toBe('membrane');
    expect(validatePageEnvelopeShape(envelope), 'обёртка несёт ровно четыре поля').toEqual([]);
    expect('scope' in envelope, 'A1: внутренний разряд наружу не поехал').toBe(false);
    expect('totalPages' in envelope, 'A2: производное число наружу не поехало').toBe(false);

    for (const item of envelope.items) {
      expect(validatePublicSampleShape(item)).toEqual([]);
      expect(forbiddenFieldsIn(item), 'storageRef и notes наружу не едут').toEqual([]);
      expect(item[TRACK_KEY_EXPIRES_FIELD], 'срок виден без разбора строки запроса').toBe(
        '2026-09-02T12:15:00.000Z',
      );
    }
  });

  it('3. прибор БЕЗ мембраны: пустая страница, и хранилище не спрошено ни разу', async () => {
    const reader = new FakeReader(rows(3));
    const service = new LibraryOwnershipService(reader);

    const page = await service.listOwnedSamples(DEVICE_WITHOUT, { page: 1, limit: 100 });
    const envelope = envelopeFromOwnedPage(page, () => ({}) as never, toPageEnvelope);

    expect(page.scope).toBe('empty');
    expect(envelope.items).toEqual([]);
    expect(envelope.total).toBe(0);
    expect(reader.calls, 'пустая ось не должна доходить до хранилища').toBe(0);
    expect(validatePageEnvelopeShape(envelope)).toEqual([]);
  });

  it('4. операция без владельца — 409, а не 404 и не 403', () => {
    const reader = new FakeReader([]);
    const service = new LibraryOwnershipService(reader);

    let caught: MembraneOwnerRequiredError | null = null;
    try {
      service.requireMembraneOwner(DEVICE_WITHOUT, 'issue-track-key');
    } catch (e) {
      caught = e as MembraneOwnerRequiredError;
    }

    expect(caught, 'операция обязана бросить именованную ошибку').toBeInstanceOf(
      MembraneOwnerRequiredError,
    );
    const response = ownerAbsentResponse(caught!);
    expect(response.status).toBe(OWNER_ABSENT_STATUS);
    expect(response.status).not.toBe(404);
    expect(response.status).not.toBe(403);
    expect(response.body.operation, 'отказ называет операцию').toBe('issue-track-key');
    expect(response.body.deviceId).toBe(DEVICE_WITHOUT.id);
  });

  it('5. чужой существующий — 403; несуществующий — 404; разряды разведены', () => {
    expect(refusalForOutcome('forbidden').status).toBe(403);
    expect(refusalForOutcome('absent').status).toBe(404);
    expect(refusalForOutcome('forbidden').status).not.toBe(refusalForOutcome('absent').status);
  });

  it('6. ответ со списком объявлен связкой ключей: no-store', () => {
    // Требование M4, у которого на вскрытии не оказалось носителя ни в одном блоке.
    expect(CREDENTIAL_BEARING_HEADERS['Cache-Control']).toBe('no-store');
  });

  it('8. полнота считается читателем; ровно полная последняя страница — не следующая', () => {
    // Дыра вердикта M2, найденная блоком `contract`: при items.length === limit и
    // page*limit === total ОБА правила заседания ложны. Канон — hasNextPage.
    const full = { items: new Array(100).fill(0), total: 100, page: 1, limit: 100 };
    const middle = { items: new Array(100).fill(0), total: 250, page: 1, limit: 100 };
    const short = { items: new Array(7).fill(0), total: 107, page: 2, limit: 100 };

    expect(hasNextPage(full), 'ровно полная последняя — следующей нет').toBe(false);
    expect(isLastPage(full)).toBe(true);
    expect(hasNextPage(middle)).toBe(true);
    expect(isLastPage(short), 'короткая страница всегда последняя').toBe(true);
  });
});
