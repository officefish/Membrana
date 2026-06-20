import React from 'react';
import { ModuleProps } from '@membrana/agenda';
import { useDeviceBoardMode } from '@membrana/device-board';

/**
 * Модуль «Доска устройства» — точка входа в board mode.
 * Визуальный редактор (XYFlow) открывается в отдельном layout через DeviceBoardShell.
 */
export const DeviceBoardModule: React.FC<ModuleProps> = () => {
  const { enterBoardMode, isBoardMode } = useDeviceBoardMode();

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
        инспектор нод и экспорт JSON (в следующих эпиках хакатона).
      </p>
      <button type="button" className="btn btn-primary w-fit" onClick={enterBoardMode}>
        Открыть доску
      </button>
    </div>
  );
};
