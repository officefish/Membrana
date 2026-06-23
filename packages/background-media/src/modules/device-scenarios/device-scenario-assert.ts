import { BadRequestException } from '@nestjs/common';

const DEVICE_SCENARIO_KIND = 'device-scenario';

/** Align with @membrana/core DEVICE_SCENARIO_MIN/MAX_DOCUMENT_VERSION (media stores JSON blob). */
const DEVICE_SCENARIO_MIN_VERSION = 1;
const DEVICE_SCENARIO_MAX_VERSION = 2;

/** Validates device-scenario document shape before persistence (v1–v2). */
export function assertDeviceScenarioDocument(body: Record<string, unknown>): void {
  if (body.kind !== DEVICE_SCENARIO_KIND) {
    throw new BadRequestException(`Expected kind ${DEVICE_SCENARIO_KIND}`);
  }
  const version = body.version;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < DEVICE_SCENARIO_MIN_VERSION ||
    version > DEVICE_SCENARIO_MAX_VERSION
  ) {
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
