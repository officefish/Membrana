/**
 * Глобальный переключатель служебных INFO-логов scenario runtime (device-board).
 * Управляется чекбоксом INFO на доске; Print (`printLine`) не затрагивается.
 */
import { logger } from '@membrana/core';

let infoLoggingEnabled = true;

/** Вкл/выкл служебные `[INFO] [device-board] …` в консоли. */
export function setScenarioRuntimeInfoLogging(enabled: boolean): void {
  infoLoggingEnabled = enabled;
}

export function isScenarioRuntimeInfoLoggingEnabled(): boolean {
  return infoLoggingEnabled;
}

/** Лог scenario runtime; уважает флаг INFO. */
export function scenarioRuntimeInfo(
  message: string,
  context?: Readonly<Record<string, unknown>>,
): void {
  if (!infoLoggingEnabled) {
    return;
  }
  logger.info(message, context);
}
