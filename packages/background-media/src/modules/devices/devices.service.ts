import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Device, DeviceKind } from '../../prisma/client';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import { PrismaService } from '../../prisma/prisma.service';
import { NodeKeyService } from '../firebat-node/node-key.service';
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
  userWorkspaces: {
    used: number;
    limit: number;
    backend: 'server';
  };
}

export interface DeviceMembraneContext {
  membraneId: string;
  userStorageQuotaBytes: bigint | number | string;
  bufferQuotaBytes: bigint | number | string;
  datasetCatalogId: string;
  maxUserWorkspaces?: number;
}

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly nodeKeys: NodeKeyService,
  ) {}

  async register(
    name: string,
    kind: DeviceKind,
    membraneContext?: DeviceMembraneContext,
  ): Promise<{ device: Device; clientKey: { raw: string; keyId: string; createdAt: Date } }> {
    const device = await this.prisma.device.create({
      data: {
        name,
        kind,
        ...(membraneContext
          ? {
              membraneId: membraneContext.membraneId,
              userStorageQuotaBytes: BigInt(membraneContext.userStorageQuotaBytes),
              bufferQuotaBytes: BigInt(membraneContext.bufferQuotaBytes),
              datasetCatalogId: membraneContext.datasetCatalogId,
              ...(membraneContext.maxUserWorkspaces !== undefined
                ? { maxUserWorkspaces: membraneContext.maxUserWorkspaces }
                : {}),
            }
          : {}),
      },
    });
    const issued = await this.nodeKeys.issue(device.id, { audience: 'client' });
    if (issued.outcome !== 'issued') {
      throw new Error(`Client media key was not issued for new device ${device.id}`);
    }
    return { device, clientKey: issued.key };
  }

  async issueClientKey(deviceId: string): Promise<{
    raw: string;
    keyId: string;
    createdAt: Date;
    rotatedFrom: string | null;
  }> {
    const issued = await this.nodeKeys.issue(deviceId, { audience: 'client', rotate: true });
    if (issued.outcome !== 'issued') {
      throw new Error(`Client media key was not issued for device ${deviceId}`);
    }
    return issued.key;
  }

  async revokeClientKey(deviceId: string) {
    return this.nodeKeys.revoke(deviceId, { audience: 'client' });
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
        ...(membraneContext.maxUserWorkspaces !== undefined
          ? { maxUserWorkspaces: membraneContext.maxUserWorkspaces }
          : {}),
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

    const [rows, workspaceCount] = await Promise.all([
      this.prisma.sample.findMany({
        where: { deviceId },
        select: {
          sizeBytes: true,
          collection: { select: { kind: true, systemKey: true } },
        },
      }),
      this.prisma.deviceWorkspace.count({ where: { deviceId } }),
    ]);

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
      userWorkspaces: {
        used: workspaceCount,
        limit: limits.maxUserWorkspaces,
        backend: 'server',
      },
    };
  }
}
