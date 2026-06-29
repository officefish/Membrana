export interface AcquireScenarioEditLeaseDto {
  revision?: number;
}

export interface RenewScenarioEditLeaseDto {
  revision?: number;
}

function isValidRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function parseAcquireScenarioEditLeaseDto(raw: unknown): AcquireScenarioEditLeaseDto {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== 'object') {
    return {};
  }
  const revision = (raw as { revision?: unknown }).revision;
  return isValidRevision(revision) ? { revision } : {};
}

export function parseRenewScenarioEditLeaseDto(raw: unknown): RenewScenarioEditLeaseDto {
  return parseAcquireScenarioEditLeaseDto(raw);
}
