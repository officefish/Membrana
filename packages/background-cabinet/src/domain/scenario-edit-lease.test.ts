import { describe, expect, it } from 'vitest';

import {
  isScenarioEditLeaseActive,
  scenarioEditLeaseExpiresAt,
  SCENARIO_EDIT_LEASE_TTL_MS,
} from './scenario-edit-lease';

describe('scenario-edit-lease domain', () => {
  it('expiresAt is TTL from reference time', () => {
    const from = new Date('2026-06-26T10:00:00.000Z');
    const expires = scenarioEditLeaseExpiresAt(from);
    expect(expires.getTime() - from.getTime()).toBe(SCENARIO_EDIT_LEASE_TTL_MS);
  });

  it('isScenarioEditLeaseActive respects expiry', () => {
    const now = new Date('2026-06-26T10:00:00.000Z');
    expect(isScenarioEditLeaseActive(new Date('2026-06-26T10:01:00.000Z'), now)).toBe(true);
    expect(isScenarioEditLeaseActive(new Date('2026-06-26T09:59:59.000Z'), now)).toBe(false);
  });
});
