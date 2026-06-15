import { BadRequestException, ForbiddenException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { Collection, SampleLabel } from '../../prisma/client';
import { randomUUID } from 'node:crypto';
import { AudioIngestService } from '../../audio/audio-ingest.service';
import { BlobStorageService } from '../../blob/blob-storage.service';
import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import {
  sampleSourceFromApi,
  sampleToDto,
  type SampleDto,
} from '../../lib/sample-dto';
import { normalizeSampleLabel } from '../../lib/sample-label';
import { PrismaService } from '../../prisma/prisma.service';
import { CollectionsService } from '../collections/collections.service';
import { DevicesService } from '../devices/devices.service';

export interface UploadMetaOverride {
  title?: string;
  class?: string;
  label?: SampleLabel;
  source?: string;
  durationSec?: number;
  sampleRate?: number;
  channels?: 1 | 2;
  notes?: string;
}

export interface PatchSampleLabelInput {
  label?: string;
  notes?: string | null;
}

export interface UpdateLabelNotesOptions {
  /** Set by cabinet media-bridge when curator has admin role. */
  readonly catalogAdmin?: boolean;
}

@Injectable()
export class SamplesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collections: CollectionsService,
    private readonly devices: DevicesService,
    private readonly blobs: BlobStorageService,
    private readonly audio: AudioIngestService,
  ) {}

  async list(deviceId: string, collectionId: string): Promise<SampleDto[]> {
    await this.collections.getOwned(deviceId, collectionId);
    const rows = await this.prisma.sample.findMany({
      where: { deviceId, collectionId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(sampleToDto);
  }

  async upload(
    deviceId: string,
    collectionId: string,
    fileBuffer: Buffer,
    mimeType: string | undefined,
    meta?: UploadMetaOverride,
  ): Promise<SampleDto> {
    const collection = await this.collections.getOwned(deviceId, collectionId);
    this.assertUploadAllowed(collection);

    const parsed = await this.audio.parseUpload(fileBuffer, mimeType);
    const quota = await this.devices.getQuota(deviceId);
    const bucket =
      collection.kind === 'buffer'
        ? quota.buffer
        : collection.kind === 'user' ||
            (collection.kind === 'system' && collection.systemKey !== TARIFF_DATASET_SYSTEM_KEY)
          ? quota.userStorage
          : null;

    if (bucket && bucket.usedBytes + parsed.sizeBytes > bucket.limitBytes) {
      throw new PayloadTooLargeException(
        collection.kind === 'buffer'
          ? 'Buffer storage quota exceeded'
          : 'User storage quota exceeded',
      );
    }

    const sampleId = randomUUID();
    const storageRef = this.blobs.buildStorageRef(
      deviceId,
      sampleId,
      parsed.audioFormat,
    );

    await this.blobs.write(storageRef, fileBuffer);

    try {
      const row = await this.prisma.sample.create({
        data: {
          id: sampleId,
          deviceId,
          collectionId,
          title: meta?.title ?? `Sample ${sampleId.slice(0, 8)}`,
          class: meta?.class ?? 'unclassified',
          label: meta?.label ?? 'unlabeled',
          source: meta?.source ? sampleSourceFromApi(meta.source) : 'disk_import',
          durationSec: meta?.durationSec ?? parsed.durationSec,
          sampleRate: meta?.sampleRate ?? parsed.sampleRate,
          channels: meta?.channels ?? parsed.channels,
          audioFormat: parsed.audioFormat,
          contentType: parsed.contentType,
          sizeBytes: parsed.sizeBytes,
          storageRef,
          notes: meta?.notes,
        },
      });
      return sampleToDto(row);
    } catch (err) {
      await this.blobs.delete(storageRef);
      throw err;
    }
  }

  async getBlob(deviceId: string, sampleId: string): Promise<{
    stream: ReturnType<BlobStorageService['createReadStream']>;
    contentType: string;
  }> {
    const row = await this.getOwnedSample(deviceId, sampleId);
    return {
      stream: this.blobs.createReadStream(row.storageRef),
      contentType: row.contentType,
    };
  }

  async delete(deviceId: string, sampleId: string): Promise<void> {
    const row = await this.getOwnedSample(deviceId, sampleId);
    if (row.collection.systemKey === TARIFF_DATASET_SYSTEM_KEY) {
      throw new BadRequestException('Cannot delete samples from tariff dataset collection');
    }
    await this.blobs.delete(row.storageRef);
    await this.prisma.sample.delete({ where: { id: sampleId } });
  }

  async move(
    deviceId: string,
    sampleId: string,
    toCollectionId: string,
  ): Promise<SampleDto> {
    const toCollection = await this.collections.getOwned(deviceId, toCollectionId);
    const row = await this.getOwnedSample(deviceId, sampleId);
    if (row.collection.systemKey === TARIFF_DATASET_SYSTEM_KEY) {
      throw new BadRequestException('Cannot move samples from tariff dataset collection');
    }
    this.assertUploadAllowed(toCollection);
    if (row.collectionId === toCollectionId) {
      return sampleToDto(row);
    }
    const updated = await this.prisma.sample.update({
      where: { id: sampleId },
      data: {
        collectionId: toCollectionId,
        source: 'move',
      },
    });
    return sampleToDto(updated);
  }

  async updateLabelNotes(
    deviceId: string,
    sampleId: string,
    patch: PatchSampleLabelInput,
    options: UpdateLabelNotesOptions = {},
  ): Promise<SampleDto> {
    const row = await this.getOwnedSample(deviceId, sampleId);
    const isTariff = row.collection.systemKey === TARIFF_DATASET_SYSTEM_KEY;

    if (isTariff && !options.catalogAdmin) {
      throw new ForbiddenException(
        'Tariff dataset label/notes require catalog admin (cabinet)',
      );
    }

    const data: { label?: SampleLabel; notes?: string | null } = {};
    if (patch.label !== undefined) {
      data.label = normalizeSampleLabel(patch.label);
    }
    if (patch.notes !== undefined) {
      data.notes = patch.notes;
    }

    if (isTariff && options.catalogAdmin) {
      await this.prisma.sample.updateMany({
        where: {
          collectionId: row.collectionId,
          title: row.title,
          collection: { systemKey: TARIFF_DATASET_SYSTEM_KEY },
        },
        data,
      });
      const refreshed = await this.prisma.sample.findFirst({
        where: { id: sampleId, deviceId },
      });
      if (!refreshed) {
        throw new NotFoundException(`Sample ${sampleId} not found for device`);
      }
      return sampleToDto(refreshed);
    }

    const updated = await this.prisma.sample.update({
      where: { id: sampleId },
      data,
    });
    return sampleToDto(updated);
  }

  private async getOwnedSample(deviceId: string, sampleId: string) {
    const row = await this.prisma.sample.findFirst({
      where: { id: sampleId, deviceId },
      include: { collection: true },
    });
    if (!row) {
      throw new NotFoundException(`Sample ${sampleId} not found for device`);
    }
    return row;
  }

  private assertUploadAllowed(collection: Collection): void {
    if (collection.kind === 'system' && collection.systemKey === TARIFF_DATASET_SYSTEM_KEY) {
      throw new BadRequestException('Cannot upload to tariff dataset collection');
    }
  }
}
