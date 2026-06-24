import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { DeviceScenarioRecordDto } from './device-scenarios.dto';
import { assertDeviceScenarioDocument } from '../../lib/device-scenario-assert';

@Injectable()
export class DeviceScenariosService {
  constructor(private readonly prisma: PrismaService) {}

  async getScenario(deviceId: string): Promise<DeviceScenarioRecordDto | null> {
    const row = await this.prisma.deviceScenario.findUnique({ where: { deviceId } });
    if (row === null) {
      return null;
    }
    return {
      document: row.payload as Record<string, unknown>,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async putScenario(deviceId: string, document: Record<string, unknown>): Promise<DeviceScenarioRecordDto> {
    assertDeviceScenarioDocument(document);

    const row = await this.prisma.deviceScenario.upsert({
      where: { deviceId },
      create: {
        deviceId,
        payload: document as Prisma.InputJsonValue,
      },
      update: {
        payload: document as Prisma.InputJsonValue,
      },
    });

    return {
      document: row.payload as Record<string, unknown>,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
