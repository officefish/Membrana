import { BadRequestException } from '@nestjs/common';

const DEVICE_SCENARIO_KIND = 'device-scenario';

/** Align with @membrana/core DEVICE_SCENARIO_MIN/MAX_DOCUMENT_VERSION (media stores JSON blob). */
const DEVICE_SCENARIO_MIN_VERSION = 1;
const DEVICE_SCENARIO_MAX_VERSION = 2;

/** Returns a validation error message, or null when the document shape is acceptable (v1–v2). */
export function validateDeviceScenarioDocument(body: Record<string, unknown>): string | null {
  if (body.kind !== DEVICE_SCENARIO_KIND) {
    return `Expected kind ${DEVICE_SCENARIO_KIND}`;
  }
  const version = body.version;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < DEVICE_SCENARIO_MIN_VERSION ||
    version > DEVICE_SCENARIO_MAX_VERSION
  ) {
    return `Unsupported device-scenario version ${String(version)}`;
  }
  if (typeof body.deviceKind !== 'string') {
    return 'deviceKind is required';
  }
  if (body.signalGraph === undefined || typeof body.signalGraph !== 'object' || body.signalGraph === null) {
    return 'signalGraph is required';
  }
  if (body.scenario === undefined || typeof body.scenario !== 'object' || body.scenario === null) {
    return 'scenario is required';
  }
  return null;
}

/** Validates device-scenario document shape before persistence (v1–v2). */
export function assertDeviceScenarioDocument(body: Record<string, unknown>): void {
  const validationError = validateDeviceScenarioDocument(body);
  if (validationError !== null) {
    throw new BadRequestException(validationError);
  }
}
