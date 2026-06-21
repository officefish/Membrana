/** Persisted config модуля device-board (agenda modulePrefs). */
export interface DeviceBoardModuleConfig {
  /** Показывать каталог UserCases на доске (U9 G1). */
  readonly userCasesCatalogEnabled: boolean;
  /** Tariff SKU, активированные для мембраны (stub до cabinet). */
  readonly entitledTariffSkus: readonly string[];
}

export const DEVICE_BOARD_MODULE_ID = 'device-board' as const;

export const DEFAULT_DEVICE_BOARD_MODULE_CONFIG: DeviceBoardModuleConfig = {
  userCasesCatalogEnabled: true,
  entitledTariffSkus: [],
};

/** Нормализует partial config из store. */
export function normalizeDeviceBoardModuleConfig(
  input: Partial<DeviceBoardModuleConfig> | undefined,
): DeviceBoardModuleConfig {
  return {
    userCasesCatalogEnabled:
      input?.userCasesCatalogEnabled ?? DEFAULT_DEVICE_BOARD_MODULE_CONFIG.userCasesCatalogEnabled,
    entitledTariffSkus: Array.isArray(input?.entitledTariffSkus)
      ? input.entitledTariffSkus.filter((sku): sku is string => typeof sku === 'string')
      : DEFAULT_DEVICE_BOARD_MODULE_CONFIG.entitledTariffSkus,
  };
}
