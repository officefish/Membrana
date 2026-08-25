import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
    expect(result.label).toBe('not-drone');
  });
});

describe('SamplesService.upload audio metadata contract', () => {
  const prisma = {
    sample: {
      create: vi.fn(),
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
    collections.getOwned.mockResolvedValue({ kind: 'user', systemKey: null });
    devices.getQuota.mockResolvedValue({
      userStorage: { usedBytes: 0, limitBytes: 1_000_000 },
      buffer: { usedBytes: 0, limitBytes: 1_000_000 },
    });
    blobs.buildStorageRef.mockReturnValue('dev/sample.wav');
    audio.parseUpload.mockResolvedValue({
      durationSec: 1.25,
      sampleRate: 44_100,
      channels: 1,
      audioFormat: 'wav',
      contentType: 'audio/wav',
      sizeBytes: 100,
    });
    prisma.sample.create.mockImplementation(async ({ data }) => makeSampleRow({
      id: data.id,
      deviceId: data.deviceId,
      collectionId: data.collectionId,
      title: data.title,
      systemKey: null,
      durationSec: data.durationSec,
      sampleRate: data.sampleRate,
      channels: data.channels,
    } as never));
  });

  it('stores measured WAV metadata, not declared meta values', async () => {
    const out = await service.upload(
      'dev-1',
      'col-1',
      Buffer.from('wav'),
      'audio/wav',
      { title: 'declared-ok', durationSec: 1.25, sampleRate: 44_100, channels: 1 },
    );

    expect(out.sampleRate).toBe(44_100);
    expect(prisma.sample.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        durationSec: 1.25,
        sampleRate: 44_100,
        channels: 1,
      }),
    });
  });

  it('rejects declared 48 kHz when measured WAV bytes are 44.1 kHz', async () => {
    await expect(
      service.upload(
        'dev-1',
        'col-1',
        Buffer.from('wav'),
        'audio/wav',
        { title: 'bad-rate', durationSec: 1.25, sampleRate: 48_000, channels: 1 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(blobs.write).not.toHaveBeenCalled();
    expect(prisma.sample.create).not.toHaveBeenCalled();
  });
});
