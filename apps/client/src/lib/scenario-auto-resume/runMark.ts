/**
 * Отметка «сценарий шёл» (ADR-0033 Р2) — след исполнения ЭТОЙ машины, на сервер не едет.
 *
 * Ставится при переходе исполнения «не шёл → шёл»; снимается при любом переходе «шёл → не шёл»
 * внутри живого процесса — это всегда упорядоченная остановка (владелец, срок сценария, служебная
 * остановка, команда кабинета). Падение окна, крах процесса, пропажа питания и перезагрузка
 * перехода не порождают — отметка остаётся, и при старте сценарий возобновится.
 *
 * Хранилище — localStorage, ключ по `deviceId`; любой сбой хранилища читается как «не шёл».
 */

const KEY_PREFIX = 'membrana.scenarioAutoResume.runMark.';
const FLAG_KEY_PREFIX = 'membrana.scenarioAutoResume.lastKnownFlag.';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readRunMark(deviceId: string): boolean {
  try {
    const s = storage();
    return s !== null && s.getItem(KEY_PREFIX + deviceId) !== null;
  } catch {
    return false;
  }
}

export function setRunMark(deviceId: string, nowIso: string): void {
  try {
    storage()?.setItem(KEY_PREFIX + deviceId, nowIso);
  } catch {
    /* хранилище недоступно — возобновления не будет, это безопасная сторона */
  }
}

export function clearRunMark(deviceId: string): void {
  try {
    storage()?.removeItem(KEY_PREFIX + deviceId);
  } catch {
    /* см. выше */
  }
}

/** Последнее известное значение признака прибора — на случай старта без сети. */
export function readLastKnownFlag(deviceId: string): boolean | null {
  try {
    const raw = storage()?.getItem(FLAG_KEY_PREFIX + deviceId);
    return raw === 'true' ? true : raw === 'false' ? false : null;
  } catch {
    return null;
  }
}

export function writeLastKnownFlag(deviceId: string, value: boolean): void {
  try {
    storage()?.setItem(FLAG_KEY_PREFIX + deviceId, value ? 'true' : 'false');
  } catch {
    /* см. выше */
  }
}

/**
 * Следит за переходами исполнения и держит отметку. Вызывается подпиской на состояние runtime.
 * Возвращает функцию-обработчик, помнящую прошлое `isRunning`.
 */
export function createRunMarkTracker(deviceIdOf: () => string | null, now: () => string = () => new Date().toISOString()) {
  let wasRunning = false;
  return (state: { readonly isRunning: boolean }): void => {
    const deviceId = deviceIdOf();
    if (deviceId === null) return;
    if (state.isRunning && !wasRunning) setRunMark(deviceId, now());
    if (!state.isRunning && wasRunning) clearRunMark(deviceId);
    wasRunning = state.isRunning;
  };
}
