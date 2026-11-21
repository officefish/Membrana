/**
 * Решение «возобновлять ли сценарий доски при старте Студии» (ADR-0033 Р2–Р3) — чистая функция.
 *
 * Возобновляется только то, что ШЛО в момент выключения или падения (отметка «шёл»), при
 * включённом владельцем признаке прибора и сопряжении. Жёсткий захват кабинетом запуск не
 * пропускает. Захват НЕИЗВЕСТЕН — запуск идёт: при подключении узел снимка захвата не получает
 * (на стволе 21.11), а дежурство важнее; пришедший позже захват вытесняет запуск штатно (CT6).
 */

export type CaptureAtStart = 'none' | 'soft' | 'hard' | 'unknown';

export interface AutoResumeInput {
  /** Признак прибора из `/quota` (или последнее известное значение); `null` — неизвестен. */
  readonly enabled: boolean | null;
  readonly paired: boolean;
  /** Была ли отметка «шёл» к моменту старта. */
  readonly wasRunning: boolean;
  readonly capture: CaptureAtStart;
}

export type AutoResumeSkipReason = 'disabled' | 'not_running' | 'not_paired' | 'hard_capture';

export type AutoResumeDecision =
  | { readonly action: 'run' }
  | {
      readonly action: 'skip';
      readonly reason: AutoResumeSkipReason;
      /** Обычный старт (выключено / не шёл) — молча; остальное — честная строка в интерфейсе. */
      readonly silent: boolean;
    };

export function decideAutoResume(input: AutoResumeInput): AutoResumeDecision {
  if (!input.wasRunning) return { action: 'skip', reason: 'not_running', silent: true };
  if (input.enabled !== true) return { action: 'skip', reason: 'disabled', silent: true };
  if (!input.paired) return { action: 'skip', reason: 'not_paired', silent: false };
  if (input.capture === 'hard') return { action: 'skip', reason: 'hard_capture', silent: false };
  return { action: 'run' };
}

/** Человеческая строка причины отказа — для интерфейса доски и shell-лога. */
export const AUTO_RESUME_SKIP_TEXT: Record<AutoResumeSkipReason, string> = {
  disabled: 'Возобновление сценария при старте выключено.',
  not_running: 'Сценарий не шёл в момент выключения — возобновлять нечего.',
  not_paired: 'Сценарий шёл до выключения, но прибор не сопряжён — запуск не выполнен.',
  hard_capture: 'Сценарий шёл до выключения, но прибор под жёстким захватом кабинета — запуск не выполнен.',
};
