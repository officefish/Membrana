/**
 * Глобальный переключатель служебных INFO-логов scenario runtime (device-board).
 * Управляется чекбоксом INFO на доске; Print (`printLine`) не затрагивается.
 */
import { logger } from '@membrana/core';

import {
  appendScenarioTraceLine,
} from './scenarioTraceBuffer';
import { withScenarioTraceContext } from './scenarioTraceContext';

let infoLoggingEnabled = true;

/** Вкл/выкл служебные `[INFO] [device-board] …` в консоли. */
export function setScenarioRuntimeInfoLogging(enabled: boolean): void {
  infoLoggingEnabled = enabled;
}

export {
  clearScenarioTraceBuffer,
  copyScenarioTraceToClipboard,
  downloadScenarioTraceFile,
  getScenarioTraceLineCount,
  subscribeScenarioTraceBuffer,
} from './scenarioTraceBuffer';

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
  const merged = withScenarioTraceContext(context);
  appendScenarioTraceLine(message, merged);
  logger.info(message, merged);
}

/**
 * Структурированный лог цепочки device-board (capture → collect → track → report → journal).
 * Формат: `[device-board][stage] event` — удобно фильтровать в консоли.
 */
export function scenarioChainLog(
  stage:
    | 'runtime'
    | 'stream'
    | 'capture'
    | 'fft'
    | 'collect'
    | 'track'
    | 'media'
    | 'analysis'
    | 'report'
    | 'journal',
  event: string,
  context?: Readonly<Record<string, unknown>>,
): void {
  scenarioRuntimeInfo(`[device-board][${stage}] ${event}`, context);
}
