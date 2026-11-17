/**
 * Зубы ДВЕРИ массового вывоза — `SamplesService.moveBatch`.
 *
 * Подмена базы здесь НЕ заглушка-на-каждый-вызов, а маленький живой мир: `updateMany`
 * действительно перекладывает строки, а `getQuota` считает оси по тем же строкам тем же
 * правилом, что и `DevicesService`. Иначе «повторный вызов не двигает перенесённое» и «ось не
 * переполнена после прогона» проверялись бы по обещаниям мока, а не по состоянию.
 *
 * ПОРЧИ → КРАСНЫЙ (каждая проверена отдельно):
 *   1. применять `updateMany` и при `dryRun` — «dryRun ничего не двигает» падает;
 *   2. снять проверку места (не звать `axisRefuses` в планировщике) — падают «ось не
 *      переполнена после прогона» и «частичный перенос: 200 и непустой stayed»;
 *   3. брать оси ответа ДО переноса при настоящем прогоне — «ответ показывает оси на конец
 *      вызова» падает;
 *   4. не звать `episodes.release` после переноса — «эпизод переполнения закрыт» падает;
 *   5. пустой список пропускать как «нечего делать» вместо 400 — «пустой список — отказ
 *      целиком» падает;
 *   6. позволить буфер как цель — «буфер целью — отказ целиком» падает;
 *   7. считать перенесённым всё запланированное без перечитывания — «перенесённое совпадает с
 *      тем, что реально легло в набор» падает на строке, ушедшей из буфера между планом и
 *      применением.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import { MAX_MOVE_BATCH_SAMPLES } from './move-batch-plan';
import { OverflowEpisodeRegistry } from './overflow-episode-registry';
import { SamplesService } from './samples.service';

const DEVICE = 'dev-1';
const LIMIT = 1_000;

const COLLECTIONS = {
  buffer: { id: 'col-buffer', deviceId: DEVICE, kind: 'buffer' as const, systemKey: null },
  user: { id: 'col-user', deviceId: DEVICE, kind: 'user' as const, systemKey: null },
  dataset: {
    id: 'col-dataset',
    deviceId: DEVICE,
    kind: 'system' as const,
    systemKey: TARIFF_DATASET_SYSTEM_KEY,
  },
};

interface WorldRow {
  id: string;
  deviceId: string;
  collectionId: string;
  sizeBytes: number;
  createdAt: Date;
  source: string;
}

/** Строка буфера: вес 100 байт, время — по порядковому номеру, если не сказано иначе. */
function bufferRow(id: string, createdAtMs: number, sizeBytes = 100): WorldRow {
  return {
    id,
    deviceId: DEVICE,
    collectionId: COLLECTIONS.buffer.id,
    sizeBytes,
    createdAt: new Date(createdAtMs),
    source: 'mic_recording',
  };
}

/**
 * Мир: строки проб + наборы. `findMany`/`updateMany` работают по нему, `getQuota` считает оси
 * тем же правилом, что `DevicesService.getQuota` (буфер → ось buffer; user и прочие system →
 * ось userStorage; тарифный датасет — вне квоты).
 */
function makeWorld(rows: WorldRow[], userStorageSeedBytes = 0) {
  const collectionOf = (id: string) =>
    Object.values(COLLECTIONS).find((c) => c.id === id) ?? null;

  const matches = (row: WorldRow, where: Record<string, unknown>): boolean => {
    if (where['deviceId'] !== undefined && row.deviceId !== where['deviceId']) return false;
    if (where['collectionId'] !== undefined && row.collectionId !== where['collectionId']) {
      return false;
    }
    const idFilter = where['id'] as { in?: readonly string[] } | undefined;
    if (idFilter?.in && !idFilter.in.includes(row.id)) return false;
    const rel = where['collection'] as { kind?: string } | undefined;
    if (rel?.kind !== undefined && collectionOf(row.collectionId)?.kind !== rel.kind) return false;
    return true;
  };

  const prisma = {
    sample: {
      findMany: vi.fn(async (args: { where: Record<string, unknown> }) =>
        rows
          .filter((row) => matches(row, args.where))
          .map((row) => ({
            ...row,
            collection: {
              kind: collectionOf(row.collectionId)?.kind,
              systemKey: collectionOf(row.collectionId)?.systemKey ?? null,
            },
          })),
      ),
      updateMany: vi.fn(
        async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          let count = 0;
          for (const row of rows) {
            if (!matches(row, args.where)) continue;
            if (typeof args.data['collectionId'] === 'string') {
              row.collectionId = args.data['collectionId'];
            }
            if (typeof args.data['source'] === 'string') row.source = args.data['source'];
            count += 1;
          }
          return { count };
        },
      ),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };

  const devices = {
    getQuota: vi.fn(async () => {
      let bufferUsed = 0;
      let userUsed = userStorageSeedBytes;
      for (const row of rows) {
        const collection = collectionOf(row.collectionId);
        if (!collection) continue;
        if (collection.kind === 'buffer') bufferUsed += row.sizeBytes;
        else if (collection.systemKey !== TARIFF_DATASET_SYSTEM_KEY) userUsed += row.sizeBytes;
      }
      return {
        buffer: { usedBytes: bufferUsed, limitBytes: LIMIT, backend: 'server' as const },
        userStorage: { usedBytes: userUsed, limitBytes: LIMIT, backend: 'server' as const },
        dataset: { catalogId: 'cat', sampleCount: 0 },
        userWorkspaces: { used: 0, limit: 3, backend: 'server' as const },
        bufferPolicy: { mode: 'stop', params: null },
      };
    }),
  };

  const collections = {
    getOwned: vi.fn(async (_deviceId: string, collectionId: string) => {
      const found = collectionOf(collectionId);
      if (!found) throw new Error(`Collection ${collectionId} not found for device`);
      return found;
    }),
  };

  const episodes = new OverflowEpisodeRegistry(() => new Date(0));
  const service = new SamplesService(
    prisma as never,
    collections as never,
    devices as never,
    { buildStorageRef: vi.fn(), write: vi.fn(), delete: vi.fn(), createReadStream: vi.fn() } as never,
    { parseUpload: vi.fn() } as never,
    episodes,
  );

  return { service, prisma, devices, collections, episodes, rows, collectionOf };
}

const inCollection = (rows: readonly WorldRow[], collectionId: string) =>
  rows.filter((r) => r.collectionId === collectionId).map((r) => r.id).sort();

describe('moveBatch — отказ целиком только не по месту', () => {
  it('пустой список — отказ целиком', async () => {
    const world = makeWorld([bufferRow('a', 1)]);

    await expect(world.service.moveBatch(DEVICE, [], COLLECTIONS.user.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(world.prisma.sample.updateMany).not.toHaveBeenCalled();
  });

  it('буфер целью — отказ целиком, а не «перенесётся 0»', async () => {
    const world = makeWorld([bufferRow('a', 1)]);

    await expect(
      world.service.moveBatch(DEVICE, ['a'], COLLECTIONS.buffer.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('тарифный датасет целью — отказ целиком', async () => {
    const world = makeWorld([bufferRow('a', 1)]);

    await expect(
      world.service.moveBatch(DEVICE, ['a'], COLLECTIONS.dataset.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('список длиннее объявленного потолка — отказ целиком, потолок назван в ответе', async () => {
    const world = makeWorld([bufferRow('a', 1)]);
    const tooMany = Array.from({ length: MAX_MOVE_BATCH_SAMPLES + 1 }, (_, i) => `s-${i}`);

    await expect(
      world.service.moveBatch(DEVICE, tooMany, COLLECTIONS.user.id),
    ).rejects.toBeInstanceOf(BadRequestException);

    const ok = await world.service.moveBatch(DEVICE, ['a'], COLLECTIONS.user.id, { dryRun: true });
    expect(ok.maxBatch).toBe(MAX_MOVE_BATCH_SAMPLES);
  });
});

describe('moveBatch — dryRun', () => {
  it('dryRun ничего не двигает и не пишет в moved', async () => {
    const world = makeWorld([bufferRow('a', 1), bufferRow('b', 2)]);

    const out = await world.service.moveBatch(DEVICE, ['a', 'b'], COLLECTIONS.user.id, {
      dryRun: true,
    });

    expect(out.moved).toEqual([]);
    expect(out.plan.willMove).toBe(2);
    expect(world.prisma.sample.updateMany).not.toHaveBeenCalled();
    expect(inCollection(world.rows, COLLECTIONS.buffer.id)).toEqual(['a', 'b']);
  });

  it('dryRun и настоящий прогон выбирают ОДНО множество при неизменном состоянии', async () => {
    // 700 байт уже в наборе — влезают три пробы из пяти.
    const rows = [1, 2, 3, 4, 5].map((n) => bufferRow(`s-${n}`, n * 1_000));
    const world = makeWorld(rows, 700);
    const requested = ['s-5', 's-3', 's-1', 's-4', 's-2'];

    const planned = await world.service.moveBatch(DEVICE, requested, COLLECTIONS.user.id, {
      dryRun: true,
    });
    const real = await world.service.moveBatch(DEVICE, requested, COLLECTIONS.user.id);

    expect(planned.plan.willMove).toBe(3);
    expect(real.moved).toEqual(['s-1', 's-2', 's-3']);
    expect(real.plan).toEqual(planned.plan);
    expect(real.stayed).toEqual(planned.stayed);
  });
});

describe('moveBatch — частичный успех', () => {
  it('200 и непустой stayed: ось цели взяла что влезло и назвала остальных', async () => {
    const rows = [1, 2, 3, 4, 5].map((n) => bufferRow(`s-${n}`, n * 1_000));
    const world = makeWorld(rows, 700);

    const out = await world.service.moveBatch(DEVICE, rows.map((r) => r.id), COLLECTIONS.user.id);

    expect(out.moved).toEqual(['s-1', 's-2', 's-3']);
    expect(out.stayed).toEqual([
      { sampleId: 's-4', reason: 'no-space' },
      { sampleId: 's-5', reason: 'no-space' },
    ]);
    expect(inCollection(world.rows, COLLECTIONS.buffer.id)).toEqual(['s-4', 's-5']);
    expect(inCollection(world.rows, COLLECTIONS.user.id)).toEqual(['s-1', 's-2', 's-3']);
  });

  it('ось не переполнена после прогона', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => bufferRow(`s-${i}`, i * 1_000, 90));
    const world = makeWorld(rows, 250);

    const out = await world.service.moveBatch(DEVICE, rows.map((r) => r.id), COLLECTIONS.user.id);

    expect(out.userStorage.usedBytes).toBeLessThanOrEqual(out.userStorage.limitBytes);
    // Правда, а не арифметика ответа: пересчёт по состоянию мира.
    const carried = world.rows
      .filter((r) => r.collectionId === COLLECTIONS.user.id)
      .reduce((sum, r) => sum + r.sizeBytes, 0);
    expect(250 + carried).toBeLessThanOrEqual(LIMIT);
    expect(out.plan.willStay).toBeGreaterThan(0);
  });

  it('ответ показывает оси на конец вызова, а не до переноса', async () => {
    const world = makeWorld([bufferRow('a', 1), bufferRow('b', 2)], 0);

    const out = await world.service.moveBatch(DEVICE, ['a', 'b'], COLLECTIONS.user.id);

    expect(out.moved).toEqual(['a', 'b']);
    expect(out.buffer.usedBytes).toBe(0);
    expect(out.userStorage.usedBytes).toBe(200);
  });

  it('перенесённое помечено происхождением move', async () => {
    const world = makeWorld([bufferRow('a', 1)]);

    await world.service.moveBatch(DEVICE, ['a'], COLLECTIONS.user.id);

    expect(world.rows[0]!.source).toBe('move');
  });
});

describe('moveBatch — идемпотентность по смыслу', () => {
  it('повторный вызов с тем же списком не двигает перенесённое и не врёт в plan', async () => {
    const world = makeWorld([bufferRow('a', 1), bufferRow('b', 2)]);

    const first = await world.service.moveBatch(DEVICE, ['a', 'b'], COLLECTIONS.user.id);
    const second = await world.service.moveBatch(DEVICE, ['a', 'b'], COLLECTIONS.user.id);

    expect(first.moved).toEqual(['a', 'b']);
    expect(second.moved).toEqual([]);
    expect(second.plan).toEqual({ willMove: 0, willStay: 2, moveBytes: 0, stayBytes: 200 });
    expect(second.stayed).toEqual([
      { sampleId: 'a', reason: 'not-in-buffer' },
      { sampleId: 'b', reason: 'not-in-buffer' },
    ]);
    expect(inCollection(world.rows, COLLECTIONS.user.id)).toEqual(['a', 'b']);
  });

  it('незнакомый адрес — not-found, не 404 на всю пачку', async () => {
    const world = makeWorld([bufferRow('a', 1)]);

    const out = await world.service.moveBatch(DEVICE, ['ghost', 'a'], COLLECTIONS.user.id);

    expect(out.moved).toEqual(['a']);
    expect(out.stayed).toEqual([{ sampleId: 'ghost', reason: 'not-found' }]);
  });

  it('проба из тарифного датасета остаётся с not-in-buffer, а не роняет вызов', async () => {
    const dataset: WorldRow = {
      id: 'ds-1',
      deviceId: DEVICE,
      collectionId: COLLECTIONS.dataset.id,
      sizeBytes: 100,
      createdAt: new Date(0),
      source: 'catalog',
    };
    const world = makeWorld([bufferRow('a', 1), dataset]);

    const out = await world.service.moveBatch(DEVICE, ['ds-1', 'a'], COLLECTIONS.user.id);

    expect(out.moved).toEqual(['a']);
    expect(out.stayed).toEqual([{ sampleId: 'ds-1', reason: 'not-in-buffer' }]);
    expect(world.rows[1]!.collectionId).toBe(COLLECTIONS.dataset.id);
  });
});

describe('moveBatch — эпизод переполнения и гонка', () => {
  it('перенос закрыл эпизод переполнения буфера: место там появилось', async () => {
    const world = makeWorld([bufferRow('a', 1)]);
    const before = world.episodes.open(DEVICE, 'buffer');

    await world.service.moveBatch(DEVICE, ['a'], COLLECTIONS.user.id);

    const after = world.episodes.open(DEVICE, 'buffer');
    expect(after.overflowId).not.toBe(before.overflowId);
  });

  it('moved — то, что реально легло в набор: ушедшая из буфера строка в moved не попадает', async () => {
    const world = makeWorld([bufferRow('a', 1), bufferRow('b', 2)]);
    // Гонка: между планом и применением проба `b` уходит из буфера чужими руками.
    const planned = world.prisma.sample.findMany;
    let call = 0;
    const original = planned.getMockImplementation()!;
    planned.mockImplementation(async (args: never) => {
      call += 1;
      if (call === 1) {
        const out = await original(args);
        world.rows[1]!.collectionId = COLLECTIONS.dataset.id;
        return out;
      }
      return original(args);
    });

    const out = await world.service.moveBatch(DEVICE, ['a', 'b'], COLLECTIONS.user.id);

    expect(out.moved).toEqual(['a']);
    expect(out.stayed).toEqual([{ sampleId: 'b', reason: 'not-in-buffer' }]);
    expect(out.plan).toEqual({ willMove: 1, willStay: 1, moveBytes: 100, stayBytes: 100 });
  });
});
