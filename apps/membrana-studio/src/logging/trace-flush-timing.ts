/**
 * Диагностический замер простоя отрисовщика на сбросе scenario trace (#2476 / #2485).
 *
 * Зачем. `preload.flushScenarioTrace` вызывает `ipcRenderer.sendSync` — единственный
 * НЕОГРАНИЧЕННЫЙ вызов на пути остановки записи. Он держит отрисовщик не время записи, а до
 * того, как до сообщения дойдёт очередь событий главного процесса; главный процесс при этом
 * ведёт приём media и опрос узла. Синтетический прибор
 * `scripts/measure-scenario-trace-teardown.mjs` эту точку подменяет заглушкой и потому её не
 * мерит. Живое число снимается только здесь.
 *
 * ВЫКЛЮЧЕНО ПО УМОЛЧАНИЮ. Включение: переменная окружения `MEMBRANA_TRACE_FLUSH_TIMING=1` при
 * запуске Студии. Выключение: убрать переменную (или любое значение кроме `1`). Продуктовое
 * поведение при выключенном флаге не меняется ни на одну инструкцию: замер стоит ВОКРУГ
 * вызова, а отчёт уходит асинхронно уже ПОСЛЕ него.
 */

export const TRACE_FLUSH_TIMING_ENV = 'MEMBRANA_TRACE_FLUSH_TIMING';

/** Один кадр при 60 Гц. Дольше — человек уже видит рывок, а не задержку. */
export const TRACE_FLUSH_FRAME_BUDGET_MS = 16;

export interface TraceFlushTimingSample {
  /** Сколько отрисовщик простоял внутри sendSync. */
  readonly blockedMs: number;
  /** Длина переданного текста трейса в символах (объём структурного клонирования). */
  readonly chars: number;
  readonly runId: string | null;
}

/** Флаг читается один раз при инициализации preload; значение — строго `'1'`. */
export function isTraceFlushTimingEnabled(env: Record<string, string | undefined>): boolean {
  return env[TRACE_FLUSH_TIMING_ENV] === '1';
}

/** Простой дольше кадра — это уже дефект отзывчивости, а не справка. */
export function traceFlushTimingLevel(blockedMs: number): 'info' | 'warn' {
  return blockedMs >= TRACE_FLUSH_FRAME_BUDGET_MS ? 'warn' : 'info';
}

export function formatTraceFlushTiming(sample: TraceFlushTimingSample): string {
  const frames = sample.blockedMs / TRACE_FLUSH_FRAME_BUDGET_MS;
  const runId = sample.runId === null || sample.runId.length === 0 ? 'none' : sample.runId;
  return (
    `scenario trace flush blocked renderer ${sample.blockedMs.toFixed(1)} ms ` +
    `(${frames.toFixed(1)} frames @60Hz, chars=${sample.chars}, runId=${runId})`
  );
}
