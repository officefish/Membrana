import { Prisma } from '../../prisma/client';
import { NotFoundException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FREE_V1_CATALOG_ID } from '../../lib/catalog-ids';
import { loadCatalogManifest } from '../../lib/catalog-manifest';
import { TARIFF_DATASET_COLLECTION_ID } from '../../lib/collection-ids';
import { CatalogProvisionService } from './catalog-provision.service';

vi.mock('../../lib/catalog-manifest', () => ({
  loadCatalogManifest: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const manifestEntry = {
  id: 'not-human-speech-clapping-01',
  path: 'not-drone/not-human-speech-clapping-01.wav',
  class: 'human-speech',
  label: 'not-drone' as const,
  durationSec: 5,
  sampleRate: 48_000,
  notes: 'test',
};

describe('CatalogProvisionService', () => {
  const prisma = {
    device: { findUnique: vi.fn() },
    sample: { findMany: vi.fn(), create: vi.fn() },
    $executeRawUnsafe: vi.fn(),
  };
  const collections = { ensureReserved: vi.fn() };
  const blobs = {
    buildStorageRef: vi.fn(() => 'dev/sample.wav'),
    write: vi.fn(),
    delete: vi.fn(),
  };
  const audio = {
    parseUpload: vi.fn(async () => ({
      durationSec: 5,
      sampleRate: 48_000,
      channels: 1 as const,
      audioFormat: 'wav' as const,
      contentType: 'audio/wav',
      sizeBytes: 100,
    })),
  };
  const config = {
    MEDIA_DEFAULT_DATASET_CATALOG_ID: FREE_V1_CATALOG_ID,
    MEDIA_CATALOG_ROOT: '/catalog',
    MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1,
    MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 1,
  };

  let service: CatalogProvisionService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.device.findUnique.mockResolvedValue({
      id: 'dev-1',
      datasetCatalogId: FREE_V1_CATALOG_ID,
    });
    prisma.sample.findMany.mockResolvedValue([]);
    prisma.$executeRawUnsafe.mockResolvedValue(1);
    collections.ensureReserved.mockResolvedValue(undefined);
    vi.mocked(loadCatalogManifest).mockResolvedValue({
      version: 2,
      catalogId: FREE_V1_CATALOG_ID,
      sampleRate: 48_000,
      durationSec: 5,
      generatedAt: '',
      generatedBy: 'test',
      sources: { drone: [], notDrone: [] },
      samples: [manifestEntry],
    });
    vi.mocked(readFile).mockResolvedValue(Buffer.from('wav'));
    service = new CatalogProvisionService(
      prisma as never,
      collections as never,
      blobs as never,
      audio as never,
      config as never,
    );
  });

  it('throws when device is missing', async () => {
    prisma.device.findUnique.mockResolvedValue(null);
    await expect(service.provisionTariffCatalogIfNeeded('dev-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('acquires advisory lock around provision', async () => {
    prisma.sample.create.mockResolvedValue({ id: 's1' });
    await service.provisionTariffCatalogIfNeeded('dev-1');
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'SELECT pg_advisory_lock(hashtext($1::text))',
      'dev-1',
    );
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'SELECT pg_advisory_unlock(hashtext($1::text))',
      'dev-1',
    );
  });

  it('treats unique violation as skipped and deletes orphan blob', async () => {
    prisma.sample.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const result = await service.provisionTariffCatalogIfNeeded('dev-1');
    expect(result.seeded).toBe(0);
    expect(result.skipped).toBe(1);
    expect(blobs.delete).toHaveBeenCalledWith('dev/sample.wav');
    expect(prisma.sample.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collectionId: TARIFF_DATASET_COLLECTION_ID,
          title: manifestEntry.id,
        }),
      }),
    );
  });
});
