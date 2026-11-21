/**
 * Перезагрузка упавшего окна Студии (дежурство прибора, дыра №5 карты node-permanent-duty 21.11).
 *
 * Окно перезагружается при `render-process-gone` и `unresponsive`, но не бесконечно: если
 * за окно `windowMs` случилось больше `maxReloads` сбоев, Студия перестаёт перезагружаться и
 * пишет в shell-лог отказ. Иначе падающая на старте страница крутилась бы в вечном цикле, а лог
 * зарастал бы одинаковыми строками, и человек не понял бы, когда всё началось.
 *
 * Чистая логика без Electron — для зубов; провод в `main.ts`.
 */

export const RELOAD_MAX_IN_WINDOW = 3;
export const RELOAD_WINDOW_MS = 10 * 60 * 1000;

export type RecoveryDecision =
  | { readonly action: 'reload'; readonly attempt: number }
  | { readonly action: 'give-up'; readonly failures: number }
  | { readonly action: 'ignore' };

export interface WindowRecoveryLimiter {
  /** Сбой окна в момент `nowMs` → перезагрузить, сдаться (один раз) или молчать (уже сдались). */
  onFailure(nowMs: number): RecoveryDecision;
}

export function createWindowRecoveryLimiter(
  maxReloads: number = RELOAD_MAX_IN_WINDOW,
  windowMs: number = RELOAD_WINDOW_MS,
): WindowRecoveryLimiter {
  let failures: number[] = [];
  let gaveUp = false;
  return {
    onFailure(nowMs) {
      if (gaveUp) return { action: 'ignore' };
      failures = failures.filter((t) => nowMs - t < windowMs);
      failures.push(nowMs);
      if (failures.length > maxReloads) {
        gaveUp = true;
        return { action: 'give-up', failures: failures.length };
      }
      return { action: 'reload', attempt: failures.length };
    },
  };
}
