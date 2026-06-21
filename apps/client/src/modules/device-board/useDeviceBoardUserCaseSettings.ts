import { useCallback, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';

import {
  DEVICE_BOARD_MODULE_ID,
  normalizeDeviceBoardModuleConfig,
  type DeviceBoardModuleConfig,
} from './device-board-module-config.js';
import { readDeviceBoardUserCaseGate } from './user-case-settings-gate.js';

/** React hook: persisted device-board UserCase settings (G1). */
export function useDeviceBoardUserCaseSettings() {
  const moduleConfig = useMembranaStore(
    (state) => state.getModule(DEVICE_BOARD_MODULE_ID)?.config,
  );
  const updateModuleConfig = useMembranaStore((state) => state.updateModuleConfig);

  const config = useMemo(
    () => normalizeDeviceBoardModuleConfig(moduleConfig as Partial<DeviceBoardModuleConfig>),
    [moduleConfig],
  );

  const setCatalogEnabled = useCallback(
    (enabled: boolean) => {
      updateModuleConfig(DEVICE_BOARD_MODULE_ID, { userCasesCatalogEnabled: enabled });
    },
    [updateModuleConfig],
  );

  const gate = useMemo(() => readDeviceBoardUserCaseGate(), [config]);

  return {
    config,
    catalogEnabled: gate.catalogEnabled,
    catalogService: gate.catalogService,
    setCatalogEnabled,
  };
}
