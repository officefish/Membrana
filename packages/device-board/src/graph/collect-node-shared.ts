import {
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  resolveScenarioCollectorConfig,
  type ScenarioCollectorConfig,
} from '@membrana/core';

/** Квадратный event-out Collect-узлов (flush, не exec tick). */
export const COLLECT_EVENT_OUT_HANDLE = 'event-out' as const;

/** Data-out: batch ref list после flush. */
export const COLLECT_BATCH_OUT_HANDLE = 'batches' as const;

/** Состояние flush-триггера на Collect-узле (per nodeId в runtime). */
export interface CollectNodeTickState {
  readonly pendingCount: number;
  readonly windowStartedAtMs: number | null;
}

/** Начальное состояние tick-счётчика Collect. */
export function createCollectTickState(): CollectNodeTickState {
  return { pendingCount: 0, windowStartedAtMs: null };
}

/** Сброс tick-счётчика после flush. */
export function resetCollectTickState(): CollectNodeTickState {
  return createCollectTickState();
}

/** Учитывает успешный append (+1 к count, старт окна при первом append). */
export function recordCollectAppend(
  state: CollectNodeTickState,
  nowMs: number,
): CollectNodeTickState {
  return {
    pendingCount: state.pendingCount + 1,
    windowStartedAtMs: state.windowStartedAtMs ?? nowMs,
  };
}

/**
 * Flush trigger MVP: `count >= queueCapacity` OR `elapsed >= windowSec`.
 * @see docs/seanses/device-board-collectors-v05-2026-06-20.md
 */
export function shouldFlushCollect(
  state: CollectNodeTickState,
  config: Partial<ScenarioCollectorConfig> | undefined,
  nowMs: number,
): boolean {
  const resolved = resolveScenarioCollectorConfig(config ?? DEFAULT_SCENARIO_COLLECTOR_CONFIG);
  if (state.pendingCount >= resolved.queueCapacity) {
    return true;
  }
  if (state.windowStartedAtMs !== null) {
    const elapsedSec = (nowMs - state.windowStartedAtMs) / 1000;
    if (elapsedSec >= resolved.windowSec) {
      return true;
    }
  }
  return false;
}

/** deviceHandle из handle singleton RecorderRef (`recorder:<id>`). */
export function deviceHandleFromRecorderSessionRef(handle: string | null): string | null {
  if (handle === null || !handle.startsWith('recorder:')) {
    return null;
  }
  const deviceHandle = handle.slice('recorder:'.length);
  return deviceHandle.length > 0 ? deviceHandle : null;
}

/** deviceHandle из handle singleton SpectralAnalyserRef (`analyser:<id>`). */
export function deviceHandleFromAnalyserSessionRef(handle: string | null): string | null {
  if (handle === null || !handle.startsWith('analyser:')) {
    return null;
  }
  const deviceHandle = handle.slice('analyser:'.length);
  return deviceHandle.length > 0 ? deviceHandle : null;
}
