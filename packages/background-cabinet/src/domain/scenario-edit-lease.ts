/** TTL edit lease (server-first v1). */
export const SCENARIO_EDIT_LEASE_TTL_MS = 15 * 60 * 1000;

export function scenarioEditLeaseExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + SCENARIO_EDIT_LEASE_TTL_MS);
}

export function isScenarioEditLeaseActive(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}
