import { useDeviceBoardMode } from '@membrana/device-board';
import type { ModuleProps } from '@membrana/agenda';

import {
  mergeDeviceBoardModuleConfig,
  UserCaseSettingsPanel,
} from './UserCaseSettingsPanel.js';
import type { DeviceBoardModuleConfig } from './device-board-module-config.js';

/**
 * Модуль «Доска устройства» — точка входа в board mode + settings UserCases (U9 G1).
 */
export const DeviceBoardModule: React.FC<ModuleProps<DeviceBoardModuleConfig>> = ({
  module,
  onUpdateConfig,
}) => {
  const { enterBoardMode, isBoardMode } = useDeviceBoardMode();
  const config = mergeDeviceBoardModuleConfig(module.config);

  if (isBoardMode) {
    return (
      <p className="text-sm text-base-content/60">
        Режим доски активен. Закройте его кнопкой «Выйти из доски» в верхней панели редактора.
      </p>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <p className="text-sm leading-relaxed text-base-content/70">
        Визуальный редактор топологии сигнала и сценария устройства: вкладки Signal / Scenario,
        инспектор нод и экспорт JSON.
      </p>
      <button type="button" className="btn btn-primary w-fit" onClick={enterBoardMode}>
        Открыть доску
      </button>

      <UserCaseSettingsPanel config={config} onUpdateConfig={onUpdateConfig} />
    </div>
  );
};
