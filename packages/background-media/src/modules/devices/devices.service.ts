import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Device, DeviceKind } from '../../prisma/client';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveDeviceLimits } from './device-limits';

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

export interface DeviceMembraneContext {
  membraneId: string;
  userStorageQuotaBytes: bigint | number | string;
  bufferQuotaBytes: bigint | number | string;
  datasetCatalogId: string;
}

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async register(
    name: string,
    kind: DeviceKind,
    membraneContext?: DeviceMembraneContext,
  ): Promise<Device> {
    return this.prisma.device.create({
      data: {
        name,
        kind,
        ...(membraneContext
          ? {
              membraneId: membraneContext.membraneId,
              userStorageQuotaBytes: BigInt(membraneContext.userStorageQuotaBytes),
              bufferQuotaBytes: BigInt(membraneContext.bufferQuotaBytes),
              datasetCatalogId: membraneContext.datasetCatalogId,
            }
          : {}),
      },
    });
  }

  async syncMembraneContext(deviceId: string, membraneContext: DeviceMembraneContext): Promise<Device> {
    const existing = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!existing) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        membraneId: membraneContext.membraneId,
        userStorageQuotaBytes: BigInt(membraneContext.userStorageQuotaBytes),
        bufferQuotaBytes: BigInt(membraneContext.bufferQuotaBytes),
        datasetCatalogId: membraneContext.datasetCatalogId,
      },
    });
  }

  async getById(deviceId: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { id: deviceId } });
  }

  async getQuota(deviceId: string): Promise<DeviceQuotaDto> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    const limits = resolveDeviceLimits(device, this.config);

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
        limitBytes: limits.userStorageQuotaBytes,
        backend: 'server',
      },
      buffer: {
        usedBytes: bufferUsed,
        limitBytes: limits.bufferQuotaBytes,
        backend: 'server',
      },
      dataset: {
        catalogId: limits.datasetCatalogId,
        sampleCount: datasetSampleCount,
      },
    };
  }
}
