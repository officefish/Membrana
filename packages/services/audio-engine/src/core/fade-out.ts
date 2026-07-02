/**
 * Планировщик fade-out для AudioParam (tariff v2, канон
 * DEVICE_BOARD_SERVER_FIRST.md v2.0 §3.1): вытеснение клиентского
 * воспроизведения захватом гасится плавно (200 мс), emergency stop —
 * hard-cut (fadeOutMs = 0).
 *
 * ИНВАРИАНТ (канон §3.3): никаких проверок захвата/permissions в engine —
 * флаги существуют только в UI и gateway.
 */

/** Минимальная поверхность AudioParam, нужная планировщику (тестируемо без Web Audio). */
export interface FadeTargetParam {
  readonly value: number;
  cancelScheduledValues(startTime: number): unknown;
  setValueAtTime(value: number, startTime: number): unknown;
  exponentialRampToValueAtTime(value: number, endTime: number): unknown;
}

/** Экспоненциальный ramp не достигает нуля — гасим до пола, затем hard-cut. */
export const FADE_OUT_FLOOR_GAIN = 0.001;

/**
 * Планирует экспоненциальное затухание громкости от текущего значения до пола
 * за `fadeOutMs`. Возвращает задержку (мс), которую вызывающему нужно выждать
 * до teardown. `fadeOutMs <= 0` → ничего не планирует, вернёт 0 (hard-cut).
 */
export function scheduleFadeOut(
  param: FadeTargetParam,
  nowSec: number,
  fadeOutMs: number,
): number {
  if (!Number.isFinite(fadeOutMs) || fadeOutMs <= 0) {
    return 0;
  }
  const startValue = Math.max(param.value, FADE_OUT_FLOOR_GAIN);
  const endSec = nowSec + fadeOutMs / 1000;
  param.cancelScheduledValues(nowSec);
  param.setValueAtTime(startValue, nowSec);
  param.exponentialRampToValueAtTime(FADE_OUT_FLOOR_GAIN, endSec);
  return fadeOutMs;
}
