import type { PreRunValidationIssue } from './validate-pre-run.js';
import { isPreRunValid } from './validate-pre-run.js';

/** Подсказка для disabled-кнопки Run при офлайн-устройстве (DBR6). */
export const DEVICE_OFFLINE_RUN_HINT = 'нет связи с устройством';

/** Подсказка при server-first capture (кабинет держит authority). */
export const CABINET_CAPTURE_RUN_HINT = 'Запуск с поля недоступен: управление из кабинета';

export interface ResolveRunDisabledReasonInput {
  readonly validationIssues: readonly PreRunValidationIssue[];
  readonly hasRuntimeHost: boolean;
  readonly isRunning: boolean;
  /** `undefined` — не проверять presence (автономный клиент). */
  readonly deviceLive?: boolean;
  /** Server-first: блокировать локальный Run при capture authority=cabinet. */
  readonly blockLocalRun?: boolean;
}

/**
 * Причина блокировки Run или `null`, если запуск разрешён (DBR6).
 */
export function resolveRunDisabledReason(input: ResolveRunDisabledReasonInput): string | null {
  if (input.blockLocalRun) {
    return CABINET_CAPTURE_RUN_HINT;
  }
  if (input.isRunning) {
    return 'Дождитесь остановки сценария';
  }
  if (!input.hasRuntimeHost) {
    return 'Runtime host недоступен';
  }
  if (input.deviceLive === false) {
    return DEVICE_OFFLINE_RUN_HINT;
  }
  if (!isPreRunValid(input.validationIssues)) {
    return 'Исправьте ошибки валидации';
  }
  return null;
}
