import { Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { SampleLabel } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AudioIngestService } from '../../audio/audio-ingest.service';
import { BlobStorageService } from '../../blob/blob-storage.service';
import {
  sampleSourceFromApi,
  sampleToDto,
  type SampleDto,
} from '../../lib/sample-dto';
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
    await this.collections.getOwned(deviceId, collectionId);

    const parsed = await this.audio.parseUpload(fileBuffer, mimeType);
    const quota = await this.devices.getQuota(deviceId);
    if (quota.usedBytes + parsed.sizeBytes > quota.limitBytes) {
      throw new PayloadTooLargeException('Device storage quota exceeded');
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
    await this.blobs.delete(row.storageRef);
    await this.prisma.sample.delete({ where: { id: sampleId } });
  }

  async move(
    deviceId: string,
    sampleId: string,
    toCollectionId: string,
  ): Promise<SampleDto> {
    await this.collections.getOwned(deviceId, toCollectionId);
    const row = await this.getOwnedSample(deviceId, sampleId);
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

  private async getOwnedSample(deviceId: string, sampleId: string) {
    const row = await this.prisma.sample.findFirst({
      where: { id: sampleId, deviceId },
    });
    if (!row) {
      throw new NotFoundException(`Sample ${sampleId} not found for device`);
    }
    return row;
  }
}
