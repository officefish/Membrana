import type { PreRunValidationIssue } from './validate-pre-run.js';
import { isPreRunValid } from './validate-pre-run.js';

/** Подсказка для disabled-кнопки Run при офлайн-устройстве (DBR6). */
export const DEVICE_OFFLINE_RUN_HINT = 'нет связи с устройством';

export interface ResolveRunDisabledReasonInput {
  readonly validationIssues: readonly PreRunValidationIssue[];
  readonly hasRuntimeHost: boolean;
  readonly isRunning: boolean;
  /** `undefined` — не проверять presence (автономный клиент). */
  readonly deviceLive?: boolean;
}

/**
 * Причина блокировки Run или `null`, если запуск разрешён (DBR6).
 */
export function resolveRunDisabledReason(input: ResolveRunDisabledReasonInput): string | null {
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
