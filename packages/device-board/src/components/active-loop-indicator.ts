import type { ScenarioRuntimeState } from '../runtime/index.js';

/**
 * Read-only индикатор активного лупа на полотне (ADR loop-switch Р3, вариант B).
 *
 * Переключение main↔alarm — рантайм-контракт (loop-transition-policy #357), узлов на
 * графе нет. Этот индикатор делает активный луп и ПРИЧИНУ перехода видимыми оператору
 * (самодокументируемость S3), не давая редактируемых узлов. Чистая функция — тест без DOM.
 *
 * `effectiveLoop` = `activeBranch` рантайма (фактический луп). Причина:
 *  - `manual`    — ручной override (`mode === 'alarm'`);
 *  - `detection` — авто-вход по combinedScore (луп alarm, но override не ручной);
 *  - `null`      — обычный main / до старта.
 */
export interface ActiveLoopIndicator {
  readonly loop: 'main' | 'alarm';
  readonly label: string;
  readonly reason: 'manual' | 'detection' | null;
  readonly reasonLabel: string | null;
}

export function resolveActiveLoopIndicator(
  state: Pick<ScenarioRuntimeState, 'isRunning' | 'activeBranch' | 'mode'>,
): ActiveLoopIndicator | null {
  if (!state.isRunning) {
    return null;
  }
  const inAlarm = state.activeBranch === 'alarm';
  if (!inAlarm) {
    return { loop: 'main', label: 'Обычный', reason: null, reasonLabel: null };
  }
  const manual = state.mode === 'alarm';
  return {
    loop: 'alarm',
    label: 'Тревога',
    reason: manual ? 'manual' : 'detection',
    reasonLabel: manual ? 'ручной режим' : 'авто-детекция',
  };
}
