import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SamplesService } from './samples.service';

describe('SamplesService.list', () => {
  const prisma = {
    sample: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };
  const collections = { getOwned: vi.fn() };
  const devices = { getQuota: vi.fn() };
  const blobs = {
    buildStorageRef: vi.fn(),
    write: vi.fn(),
    delete: vi.fn(),
    createReadStream: vi.fn(),
  };
  const audio = { parseUpload: vi.fn() };

  let service: SamplesService;

  beforeEach(() => {
    vi.clearAllMocks();
    collections.getOwned.mockResolvedValue({ id: '__buffer__', kind: 'buffer' });
    prisma.sample.count.mockResolvedValue(95);
    prisma.sample.findMany.mockResolvedValue([
      {
        id: 's1',
        collectionId: '__buffer__',
        title: 'a',
        class: 'x',
        label: 'unlabeled',
        source: 'disk_import',
        durationSec: 1,
        sampleRate: 48_000,
        channels: 1,
        audioFormat: 'wav',
        contentType: 'audio/wav',
        sizeBytes: 10,
        storageRef: 'ref',
        notes: null,
        createdAt: new Date('2026-01-01'),
      },
    ]);
    service = new SamplesService(
      prisma as never,
      collections as never,
      devices as never,
      blobs as never,
      audio as never,
    );
  });

  it('returns paginated samples with metadata', async () => {
    const result = await service.list('dev-1', '__buffer__', 2, 40);
    expect(prisma.sample.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 40 }),
    );
    expect(result).toMatchObject({
      page: 2,
      limit: 40,
      total: 95,
      totalPages: 3,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe('a');
  });
});
