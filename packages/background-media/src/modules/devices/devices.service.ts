import { Inject, Injectable } from '@nestjs/common';
import type { Device, DeviceKind } from '@prisma/client';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import { PrismaService } from '../../prisma/prisma.service';

export interface QuotaBucketDto {
  usedBytes: number;
  limitBytes: number;
  backend: 'server';
}

export interface DatasetQuotaInfoDto {
  catalogId: string;
  sampleCount: number;
}

export interface DeviceQuotaDto {
  userStorage: QuotaBucketDto;
  buffer: QuotaBucketDto;
  dataset: DatasetQuotaInfoDto;
}

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async register(name: string, kind: DeviceKind): Promise<Device> {
    return this.prisma.device.create({
      data: { name, kind },
    });
  }

  async getById(deviceId: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { id: deviceId } });
  }

  async getQuota(deviceId: string): Promise<DeviceQuotaDto> {
    const rows = await this.prisma.sample.findMany({
      where: { deviceId },
      select: {
        sizeBytes: true,
        collection: { select: { kind: true, systemKey: true } },
      },
    });

    let userStorageUsed = 0;
    let bufferUsed = 0;
    let datasetSampleCount = 0;

    for (const row of rows) {
      const { kind, systemKey } = row.collection;
      if (kind === 'buffer') {
        bufferUsed += row.sizeBytes;
      } else if (kind === 'user' || (kind === 'system' && systemKey !== TARIFF_DATASET_SYSTEM_KEY)) {
        userStorageUsed += row.sizeBytes;
      } else if (kind === 'system' && systemKey === TARIFF_DATASET_SYSTEM_KEY) {
        datasetSampleCount += 1;
      }
    }

    return {
      userStorage: {
        usedBytes: userStorageUsed,
        limitBytes: this.config.MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE,
        backend: 'server',
      },
      buffer: {
        usedBytes: bufferUsed,
        limitBytes: this.config.MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE,
        backend: 'server',
      },
      dataset: {
        catalogId: this.config.MEDIA_DEFAULT_DATASET_CATALOG_ID,
        sampleCount: datasetSampleCount,
      },
    };
  }
}
