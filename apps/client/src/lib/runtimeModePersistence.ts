import type { RuntimeMode } from '@membrana/core';

/** Ключ localStorage для ручного режима runtime (MP7b RT7). */
export const RUNTIME_MODE_STORAGE_KEY = 'membrana.deviceBoard.runtimeMode';

/**
 * MP7b RT7: персист ручного режима normal/alarm между перезапусками узла.
 * Чтение терпимо к отсутствию/недоступности localStorage (SSR, приватный режим).
 */
export function loadPersistedRuntimeMode(): RuntimeMode {
  try {
    const value = globalThis.localStorage?.getItem(RUNTIME_MODE_STORAGE_KEY);
    return value === 'alarm' ? 'alarm' : 'normal';
  } catch {
    return 'normal';
  }
}

export function savePersistedRuntimeMode(mode: RuntimeMode): void {
  try {
    globalThis.localStorage?.setItem(RUNTIME_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore storage failures */
  }
}
