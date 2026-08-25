import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface LastSampleProbeDto {
  readonly lastSampleAt: string | null;
  readonly sampleId: string | null;
  readonly deviceId: string | null;
}

@Injectable()
export class DeployPreflightService {
  constructor(private readonly prisma: PrismaService) {}

  async lastSample(): Promise<LastSampleProbeDto> {
    const sample = await this.prisma.sample.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, deviceId: true, createdAt: true },
    });
    return {
      lastSampleAt: sample?.createdAt.toISOString() ?? null,
      sampleId: sample?.id ?? null,
      deviceId: sample?.deviceId ?? null,
    };
  }
}
