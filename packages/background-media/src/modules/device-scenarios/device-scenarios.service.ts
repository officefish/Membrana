import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { DeviceScenarioRecordDto } from './device-scenarios.dto';

const DEVICE_SCENARIO_KIND = 'device-scenario';
const DEVICE_SCENARIO_VERSION = 1;

function assertDeviceScenarioDocument(body: Record<string, unknown>): void {
  if (body.kind !== DEVICE_SCENARIO_KIND) {
    throw new BadRequestException(`Expected kind ${DEVICE_SCENARIO_KIND}`);
  }
  const version = body.version;
  if (typeof version !== 'number' || version !== DEVICE_SCENARIO_VERSION) {
    throw new BadRequestException(`Unsupported device-scenario version ${String(version)}`);
  }
  if (typeof body.deviceKind !== 'string') {
    throw new BadRequestException('deviceKind is required');
  }
  if (body.signalGraph === undefined || typeof body.signalGraph !== 'object' || body.signalGraph === null) {
    throw new BadRequestException('signalGraph is required');
  }
  if (body.scenario === undefined || typeof body.scenario !== 'object' || body.scenario === null) {
    throw new BadRequestException('scenario is required');
  }
}

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
