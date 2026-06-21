import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DEVICE_BOARD_MODULE_CONFIG,
  normalizeDeviceBoardModuleConfig,
} from './device-board-module-config.js';
import {
  entitlementBadgeLabel,
  readDeviceBoardUserCaseGate,
} from './user-case-settings-gate.js';

describe('user-case-settings-gate', () => {
  it('normalizeDeviceBoardModuleConfig defaults catalog enabled', () => {
    expect(normalizeDeviceBoardModuleConfig(undefined)).toEqual(
      DEFAULT_DEVICE_BOARD_MODULE_CONFIG,
    );
    expect(normalizeDeviceBoardModuleConfig({}).userCasesCatalogEnabled).toBe(true);
  });

  it('readDeviceBoardUserCaseGate uses registry module config when registered', () => {
    const gate = readDeviceBoardUserCaseGate();
    expect(typeof gate.catalogEnabled).toBe('boolean');
    expect(gate.catalogService.listCards('microphone').length).toBeGreaterThanOrEqual(1);
  });

  it('entitlementBadgeLabel maps statuses', () => {
    expect(entitlementBadgeLabel('bundled')).toBe('Bundled');
    expect(entitlementBadgeLabel('locked')).toBe('Тариф');
  });
});

describe('normalizeDeviceBoardModuleConfig', () => {
  it('filters entitledTariffSkus to strings', () => {
    const config = normalizeDeviceBoardModuleConfig({
      entitledTariffSkus: ['pro-v1', 42 as unknown as string],
    });
    expect(config.entitledTariffSkus).toEqual(['pro-v1']);
  });
});
