/**
 * Локальная таблица кодов возврата блока units-trace-measure.
 *
 * Вердикт M2 (team-execution-contour-m2-regulation-teeth-2026-07-19):
 * «отказ отличается от замечания кодом возврата, а не тоном» —
 * отказ = exit ≠ 0 (выход непройден), замечание = exit 0 + строка в отчёт.
 *
 * Таблица ЛОКАЛЬНА до Interface Consilium (Phase 3), где exit-коды трёх блоков
 * сводятся в единый глоссарий спринта. Единственный источник кодов блока —
 * этот модуль; магические числа в гейтах запрещены.
 */

/** Выход пройден: в порядке, либо замечание (soft). */
export const EXIT_OK = 0;

/** Отказ (hard): выход непройден. */
export const EXIT_REFUSAL = 1;

/**
 * @typedef {'pass' | 'soft' | 'hard'} TraceVerdict
 *
 * @typedef {object} TraceResult
 * @property {number} code       EXIT_OK | EXIT_REFUSAL
 * @property {TraceVerdict} verdict
 * @property {string} reason     человекочитаемая причина (для отчёта, не для машины)
 */

/** @type {Record<TraceVerdict, number>} verdict → exit-код; инвариант: code = 0 ⟺ verdict ∈ {pass, soft} */
export const VERDICT_TO_CODE = Object.freeze({
  pass: EXIT_OK,
  soft: EXIT_OK,
  hard: EXIT_REFUSAL,
});

/**
 * Собрать TraceResult с гарантией инварианта «код следует за вердиктом».
 * @param {TraceVerdict} verdict
 * @param {string} reason
 * @returns {TraceResult}
 */
export function traceResult(verdict, reason) {
  const code = VERDICT_TO_CODE[verdict];
  if (code === undefined) throw new Error(`Неизвестный вердикт: ${verdict}`);
  return { code, verdict, reason };
}
