import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { MembraneContextFanoutService } from './membrane-context-fanout.service';

export interface MembraneTariffFanoutRunResult {
  readonly membranes: number;
  readonly updated: number;
  readonly failed: number;
}

@Injectable()
export class MembraneTariffFanoutRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: MembraneContextFanoutService,
  ) {}

  async syncAllMembranes(): Promise<MembraneTariffFanoutRunResult> {
    const membranes = await this.prisma.membrane.findMany({ select: { id: true } });
    let updated = 0;
    let failed = 0;
    for (const membrane of membranes) {
      const result = await this.fanout.syncAllNodes(membrane.id);
      updated += result.updated;
      failed += result.failed;
    }
    return { membranes: membranes.length, updated, failed };
  }
}
