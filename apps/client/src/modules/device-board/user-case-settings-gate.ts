import { MembranaRegistry } from '@membrana/agenda';
import { getDefaultUserCaseCatalogService } from '@membrana/device-board';

import {
  ClientUserCaseCatalogService,
  type UserCaseEntitlementStatus,
} from '@membrana/usercase-catalog-service';
import {
  DEFAULT_DEVICE_BOARD_MODULE_CONFIG,
  DEVICE_BOARD_MODULE_ID,
  normalizeDeviceBoardModuleConfig,
  type DeviceBoardModuleConfig,
} from './device-board-module-config.js';

export interface DeviceBoardUserCaseGate {
  readonly catalogEnabled: boolean;
  readonly config: DeviceBoardModuleConfig;
  readonly catalogService: ClientUserCaseCatalogService;
}

/** Читает config device-board из MembranaRegistry (non-React, P1 gate). */
export function readDeviceBoardModuleConfig(): DeviceBoardModuleConfig {
  const module = MembranaRegistry.getModule(DEVICE_BOARD_MODULE_ID);
  if (module === undefined) {
    return DEFAULT_DEVICE_BOARD_MODULE_CONFIG;
  }
  return normalizeDeviceBoardModuleConfig(module.config as Partial<DeviceBoardModuleConfig>);
}

/** Gate: catalog toggle + entitlement-aware service (U9 G1). */
export function readDeviceBoardUserCaseGate(): DeviceBoardUserCaseGate {
  const config = readDeviceBoardModuleConfig();
  return {
    catalogEnabled: config.userCasesCatalogEnabled,
    config,
    catalogService: new ClientUserCaseCatalogService({
      catalog: getDefaultUserCaseCatalogService(),
      entitledTariffSkus: new Set(config.entitledTariffSkus),
    }),
  };
}

export function entitlementBadgeLabel(status: UserCaseEntitlementStatus): string {
  switch (status) {
    case 'bundled':
      return 'Bundled';
    case 'community':
      return 'Sprint';
    case 'entitled':
      return 'Тариф ✓';
    case 'locked':
      return 'Тариф';
    default:
      return status;
  }
}

export function entitlementBadgeClass(status: UserCaseEntitlementStatus): string {
  switch (status) {
    case 'bundled':
      return 'badge badge-primary badge-sm';
    case 'community':
      return 'badge badge-secondary badge-sm';
    case 'entitled':
      return 'badge badge-success badge-sm';
    case 'locked':
      return 'badge badge-ghost badge-sm opacity-70';
    default:
      return 'badge badge-ghost badge-sm';
  }
}
