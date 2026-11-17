import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TARIFF_DATASET_COLLECTION_ID, TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import { CollectionsService } from './collections.service';

/**
 * #2561: имя системного набора — человеческая подпись, а не застывший идентификатор тарифа.
 * Назначенный каталог живёт в `Device.datasetCatalogId` и едет в `/quota`; имя коллекции
 * про него молчит, иначе после смены тарифа одна из двух надписей обязательно лжёт.
 */
describe('CollectionsService.ensureReserved — имя системного набора (#2561)', () => {
  const DEVICE = 'device-1';
  const row = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
    id,
    deviceId: DEVICE,
    name,
    kind: 'system',
    systemKey: TARIFF_DATASET_SYSTEM_KEY,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    ...extra,
  });

  const prisma = {
    collection: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  let service: CollectionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.collection.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      createdAt: new Date(),
      _count: { samples: 0 },
    }));
    prisma.collection.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);
    service = new CollectionsService(prisma as never);
  });

  it('P1: новая системная коллекция названа без идентификатора тарифа', async () => {
    // Первый вызов — пустой прибор; второй — list() после создания.
    prisma.collection.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.ensureReserved(DEVICE);

    const created = prisma.collection.create.mock.calls
      .map((call) => (call[0] as { data: { id: string; name: string } }).data)
      .find((data) => data.id === TARIFF_DATASET_COLLECTION_ID);
    expect(created).toBeDefined();
    expect(created?.name).toBe('Базовый набор');
    expect(created?.name).not.toMatch(/free-v1|checkpoint-v1|observatory-v1/);
  });

  it('старая строка «Базовый набор (free-v1)» переименовывается одним UPDATE', async () => {
    const legacy = row(TARIFF_DATASET_COLLECTION_ID, 'Базовый набор (free-v1)');
    prisma.collection.findMany
      .mockResolvedValueOnce([row('__buffer__', 'Buffer', { kind: 'buffer', systemKey: null }), legacy])
      .mockResolvedValueOnce([]);

    await service.ensureReserved(DEVICE);

    expect(prisma.collection.create).not.toHaveBeenCalled();
    expect(prisma.collection.update).toHaveBeenCalledTimes(1);
    expect(prisma.collection.update).toHaveBeenCalledWith({
      where: { deviceId_id: { deviceId: DEVICE, id: TARIFF_DATASET_COLLECTION_ID } },
      data: { name: 'Базовый набор' },
    });
  });

  it('идемпотентность: уже переименованная строка — ноль записей', async () => {
    prisma.collection.findMany
      .mockResolvedValueOnce([
        row('__buffer__', 'Buffer', { kind: 'buffer', systemKey: null }),
        row(TARIFF_DATASET_COLLECTION_ID, 'Базовый набор'),
      ])
      .mockResolvedValueOnce([]);

    await service.ensureReserved(DEVICE);

    expect(prisma.collection.create).not.toHaveBeenCalled();
    expect(prisma.collection.update).not.toHaveBeenCalled();
  });

  it('имя, которое дал человек, не трогается (переименование только для заводской строки)', async () => {
    prisma.collection.findMany
      .mockResolvedValueOnce([
        row('__buffer__', 'Buffer', { kind: 'buffer', systemKey: null }),
        row(TARIFF_DATASET_COLLECTION_ID, 'Мой набор'),
      ])
      .mockResolvedValueOnce([]);

    await service.ensureReserved(DEVICE);

    expect(prisma.collection.update).not.toHaveBeenCalled();
  });
});
