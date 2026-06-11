import { Inject, Injectable } from '@nestjs/common';
import type { Device, DeviceKind } from '@prisma/client';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { PrismaService } from '../../prisma/prisma.service';

export interface QuotaDto {
  usedBytes: number;
  limitBytes: number;
  backend: 'server';
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

  async getQuota(deviceId: string): Promise<QuotaDto> {
    const agg = await this.prisma.sample.aggregate({
      where: { deviceId },
      _sum: { sizeBytes: true },
    });
    return {
      usedBytes: agg._sum.sizeBytes ?? 0,
      limitBytes: this.config.MEDIA_QUOTA_BYTES_PER_DEVICE,
      backend: 'server',
    };
  }
}
