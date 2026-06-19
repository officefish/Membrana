import type { ScenarioRuntimeHost } from './host.js';

/** Минимальный интервал между тиками main/alarm loop (~60 fps). */
export const LOOP_TICK_PAUSE_MS = 16;

/** Защита от exec-цикла без узла ∞ в одной итерации подграфа. */
export const MAX_SUBGRAPH_EXEC_STEPS = 256;

/**
 * Пауза между итерациями лупа: host port или wall-clock fallback.
 * См. `docs/SCENARIO_RUNTIME.md` §5.
 */
export function waitUntilNextLoopTick(
  host: Pick<ScenarioRuntimeHost, 'waitUntilNextLoopTick'>,
  pauseMs: number,
  signal: AbortSignal,
): Promise<void> {
  const schedule = host.waitUntilNextLoopTick;
  if (schedule !== undefined) {
    return schedule({ pauseMs, signal });
  }
  return waitMs(pauseMs, signal);
}

/** Отдаёт управление event loop (клик Stop, React paint). */
export function yieldToEventLoop(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Scenario aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => resolve(), 0);
    if (signal !== undefined) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Scenario aborted', 'AbortError'));
        },
        { once: true },
      );
    }
  });
}

/**
 * Пауза с поддержкой AbortSignal — Stop прерывает ожидание между тиками.
 */
export function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return yieldToEventLoop(signal);
  }
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Scenario aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => resolve(), ms);
    if (signal !== undefined) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Scenario aborted', 'AbortError'));
        },
        { once: true },
      );
    }
  });
}
