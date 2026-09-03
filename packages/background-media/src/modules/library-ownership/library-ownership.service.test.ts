/**
 * Зубы собственного DoD блока: пункты 1, 2 и 3.
 *
 * Соседского кода здесь нет ни строкой: хранилище замещено стабом
 * `InMemoryOwnershipSampleReader` из своей же зоны.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryOwnershipService } from './library-ownership.service';
import { OWNERSHIP_MEMBRANE_ABSENT, MembraneOwnerRequiredError } from './ownership-errors';
import type { OwnershipSampleReader } from './ownership-sample-reader';
import {
  InMemoryOwnershipSampleReader,
  type StubSampleRecord,
} from './stubs/in-memory-sample-reader.stub';

const DEVICE_OWNED = { id: 'device-1', membraneId: 'membrane-A' } as const;
const DEVICE_OWNED_TWIN = { id: 'device-2', membraneId: 'membrane-A' } as const;
const DEVICE_FOREIGN = { id: 'device-9', membraneId: 'membrane-B' } as const;
const DEVICE_UNOWNED = { id: 'device-3', membraneId: null } as const;

function row(
  id: string,
  deviceId: string,
  membraneId: string | null,
  day: number,
): StubSampleRecord {
  return {
    id,
    deviceId,
    collectionId: '__buffer__',
    createdAt: new Date(Date.UTC(2026, 7, day)),
    membraneId,
  };
}

/** Один склад на всех: иначе «видит только свои» не проверялось бы ничем. */
const LIBRARY: readonly StubSampleRecord[] = [
  row('s1', DEVICE_OWNED.id, 'membrane-A', 1),
  row('s2', DEVICE_OWNED.id, 'membrane-A', 2),
  row('s3', DEVICE_OWNED_TWIN.id, 'membrane-A', 3),
  row('s4', DEVICE_FOREIGN.id, 'membrane-B', 4),
  row('s5', DEVICE_UNOWNED.id, null, 5),
];

describe('LibraryOwnershipService.listOwnedSamples', () => {
  let reader: InMemoryOwnershipSampleReader;
  let service: LibraryOwnershipService;

  beforeEach(() => {
    reader = new InMemoryOwnershipSampleReader(LIBRARY);
    service = new LibraryOwnershipService(reader);
  });

  // DoD 1
  it('прибор с мембраной → треки его мембраны, включая треки прибора-соседа по мембране', async () => {
    const page = await service.listOwnedSamples(DEVICE_OWNED, { page: 1, limit: 10 });
    expect(page.scope).toBe('membrane');
    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.id)).toEqual(['s3', 's2', 's1']);
  });

  it('чужой мембраны и бесхозных треков в выдаче нет', async () => {
    const page = await service.listOwnedSamples(DEVICE_OWNED, { page: 1, limit: 10 });
    expect(page.items.map((item) => item.id)).not.toContain('s4');
    expect(page.items.map((item) => item.id)).not.toContain('s5');
  });

  it('выборка идёт по мембране, а не по deviceId: фильтр несёт только membraneId', async () => {
    await service.listOwnedSamples(DEVICE_OWNED, { page: 1, limit: 10 });
    for (const filter of reader.seenFilters) {
      expect(Object.keys(filter)).toEqual(['membraneId']);
      expect(filter.membraneId).toBe('membrane-A');
    }
  });

  it('пагинация режет по странице, total остаётся полным', async () => {
    const page = await service.listOwnedSamples(DEVICE_OWNED, { page: 2, limit: 2 });
    expect(page).toMatchObject({ page: 2, limit: 2, total: 3, scope: 'membrane' });
    expect(page.items.map((item) => item.id)).toEqual(['s1']);
  });

  it('окно дат сужает выборку внутри одной мембраны', async () => {
    const page = await service.listOwnedSamples(DEVICE_OWNED, {
      page: 1,
      limit: 10,
      createdFrom: new Date(Date.UTC(2026, 7, 2)),
    });
    expect(page.items.map((item) => item.id)).toEqual(['s3', 's2']);
  });

  it('в строке выдачи нет полезной нагрузки: ни storageRef, ни notes, ни поля ключа', async () => {
    const page = await service.listOwnedSamples(DEVICE_OWNED, { page: 1, limit: 10 });
    for (const item of page.items) {
      expect(Object.keys(item).sort()).toEqual(['collectionId', 'createdAt', 'deviceId', 'id']);
    }
  });

  // DoD 2 — ключевая асимметрия вердикта M1
  it('прибор БЕЗ мембраны → пустое множество, а НЕ ошибка', async () => {
    const page = await service.listOwnedSamples(DEVICE_UNOWNED, { page: 1, limit: 10 });
    expect(page).toEqual({ items: [], total: 0, page: 1, limit: 10, scope: 'empty' });
  });

  it('прибор без мембраны: хранилище не спрошено НИ РАЗУ — запроса с несуществующим владельцем не бывает', async () => {
    await service.listOwnedSamples(DEVICE_UNOWNED, { page: 1, limit: 10 });
    expect(reader.calls).toEqual({ count: 0, findPage: 0 });
    expect(reader.seenFilters).toHaveLength(0);
  });

  it('пустое множество по оси владения отличимо от «ничего не нашлось» разрядом scope', async () => {
    const noOwner = await service.listOwnedSamples(DEVICE_UNOWNED, { page: 1, limit: 10 });
    const emptyWindow = await service.listOwnedSamples(DEVICE_OWNED, {
      page: 1,
      limit: 10,
      createdFrom: new Date(Date.UTC(2030, 0, 1)),
    });
    expect(noOwner.scope).toBe('empty');
    expect(emptyWindow.scope).toBe('membrane');
    expect(emptyWindow.items).toHaveLength(0);
  });

  it('мембрана без единого трека — законная пустая выдача, а не отказ', async () => {
    const page = await service.listOwnedSamples(
      { id: 'device-7', membraneId: 'membrane-Z' },
      { page: 1, limit: 10 },
    );
    expect(page).toMatchObject({ items: [], total: 0, scope: 'membrane' });
  });
});

describe('LibraryOwnershipService.requireMembraneOwner', () => {
  const reader: OwnershipSampleReader = {
    count: vi.fn(),
    findPage: vi.fn(),
  };
  const service = new LibraryOwnershipService(reader);

  it('прибор с мембраной → владелец возвращён', () => {
    expect(service.requireMembraneOwner(DEVICE_OWNED, 'issue-track-key')).toBe('membrane-A');
  });

  // DoD 3
  it('прибор БЕЗ мембраны → именованная ошибка, не null и не молчание', () => {
    expect(() => service.requireMembraneOwner(DEVICE_UNOWNED, 'issue-track-key')).toThrowError(
      MembraneOwnerRequiredError,
    );
  });

  it('ошибка несёт машинный код, прибор и имя операции', () => {
    try {
      service.requireMembraneOwner(DEVICE_UNOWNED, 'issue-track-key');
      expect.unreachable('operation requiring an owner must fail loudly');
    } catch (error) {
      const err = error as MembraneOwnerRequiredError;
      expect(err.code).toBe(OWNERSHIP_MEMBRANE_ABSENT);
      expect(err.deviceId).toBe('device-3');
      expect(err.operation).toBe('issue-track-key');
      expect(err.name).toBe('MembraneOwnerRequiredError');
    }
  });

  it.each(['', '   ', null, undefined])(
    'пустая мембрана (%s) роняет операцию так же, как её отсутствие',
    (membraneId) => {
      expect(() =>
        service.requireMembraneOwner(
          { id: 'device-4', membraneId: membraneId as string | null },
          'rotate-membrane-key',
        ),
      ).toThrowError(MembraneOwnerRequiredError);
    },
  );

  it('операция никогда не возвращает владельца, равного deviceId', () => {
    expect(service.requireMembraneOwner(DEVICE_OWNED, 'set-ttl')).not.toBe(DEVICE_OWNED.id);
  });
});
