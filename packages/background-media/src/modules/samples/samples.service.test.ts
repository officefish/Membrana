import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import { SamplesService } from './samples.service';

function makeSampleRow(overrides: Partial<{
  id: string;
  deviceId: string;
  collectionId: string;
  title: string;
  systemKey: string | null;
}> = {}) {
  return {
    id: 'sample-1',
    deviceId: 'dev-1',
    collectionId: '__tariff_dataset__',
    title: 'drone-mj-test',
    class: 'drone-multirotor',
    label: 'unlabeled' as const,
    source: 'catalog' as const,
    durationSec: 5,
    sampleRate: 48_000,
    channels: 1,
    audioFormat: 'wav' as const,
    contentType: 'audio/wav',
    sizeBytes: 1000,
    storageRef: 'ref',
    notes: null,
    createdAt: new Date(),
    collection: {
      systemKey: overrides.systemKey ?? TARIFF_DATASET_SYSTEM_KEY,
      kind: 'system' as const,
    },
    ...overrides,
  };
}

describe('SamplesService.updateLabelNotes', () => {
  const prisma = {
    sample: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const collections = { getOwned: vi.fn() };
  const devices = { getQuota: vi.fn() };
  const blobs = { buildStorageRef: vi.fn(), write: vi.fn(), delete: vi.fn(), createReadStream: vi.fn() };
  const audio = { parseUpload: vi.fn() };

  let service: SamplesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SamplesService(
      prisma as never,
      collections as never,
      devices as never,
      blobs as never,
      audio as never,
    );
  });

  it('rejects tariff dataset patch without catalog admin', async () => {
    prisma.sample.findFirst.mockResolvedValue(makeSampleRow());

    await expect(
      service.updateLabelNotes('dev-1', 'sample-1', { label: 'drone' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fan-out tariff label update by catalog title when catalog admin', async () => {
    const row = makeSampleRow();
    prisma.sample.findFirst
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({ ...row, label: 'drone', notes: 'test note' });
    prisma.sample.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.updateLabelNotes(
      'dev-1',
      'sample-1',
      { label: 'drone', notes: 'test note' },
      { catalogAdmin: true },
    );

    expect(prisma.sample.updateMany).toHaveBeenCalledWith({
      where: {
        collectionId: '__tariff_dataset__',
        title: 'drone-mj-test',
        collection: { systemKey: TARIFF_DATASET_SYSTEM_KEY },
      },
      data: { label: 'drone', notes: 'test note' },
    });
    expect(result.label).toBe('drone');
    expect(result.notes).toBe('test note');
  });

  it('updates user collection sample without catalog admin', async () => {
    const row = makeSampleRow({
      collectionId: 'user-col-1',
      title: 'My recording',
    });
    row.collection.systemKey = null;
    prisma.sample.findFirst.mockResolvedValue(row);
    prisma.sample.update.mockResolvedValue({ ...row, label: 'not_drone', notes: 'wind' });

    const result = await service.updateLabelNotes('dev-1', 'sample-1', {
      label: 'not-drone',
      notes: 'wind',
    });

    expect(prisma.sample.update).toHaveBeenCalled();
    expect(prisma.sample.updateMany).not.toHaveBeenCalled();
    expect(result.label).toBe('not_drone');
  });
});
