import React from 'react';
import type { ModuleProps } from '@membrana/agenda';

import { DeviceBoardLauncher } from './DeviceBoardLauncher.js';
import type { DeviceBoardModuleConfig } from './device-board-module-config.js';

/**
 * Модуль «Доска устройства» — launcher сценариев (U10 W2-module) + вход в board mode.
 */
export const DeviceBoardModule: React.FC<ModuleProps<DeviceBoardModuleConfig>> = ({
  module,
  onUpdateConfig,
}) => {
  return <DeviceBoardLauncher config={module.config} onUpdateConfig={onUpdateConfig} />;
};
