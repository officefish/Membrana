import { BadRequestException } from '@nestjs/common';

const DEVICE_SCENARIO_KIND = 'device-scenario';
const DEVICE_SCENARIO_VERSION = 1;

/** Validates device-scenario v1 document shape before persistence. */
export function assertDeviceScenarioDocument(body: Record<string, unknown>): void {
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
