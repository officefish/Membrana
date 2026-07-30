/**
 * Вердикты, класс вердикта и таблица кодов возврата блока `execution-gate`.
 * Единственный источник; магические числа в гейте и в CLI запрещены.
 *
 * ТРИ кода, и третий несущий (CONCEPT §5):
 *   0 — проверка СОСТОЯЛАСЬ и сказала «да»
 *   1 — проверка СОСТОЯЛАСЬ и сказала «нет»
 *   2 — проверка НЕ СОСТОЯЛАСЬ (ошибка входа)
 * Слитые в один ненулевой код, 1 и 2 воспроизводят класс, на котором 30.07 был
 * пойман `meeting:audit`: «инструмент не нашёл предмета» и «инструмент нашёл
 * нарушение» становятся неразличимы.
 */

/** Проверка состоялась, ответ «да». */
export const EXIT_YES = 0;
/** Проверка состоялась, ответ «нет» (есть остановка). */
export const EXIT_NO = 1;
/** Проверка НЕ состоялась: ошибка входа. Само число `//provisional` — владелец его не называл. */
export const EXIT_NOT_PERFORMED = 2;

export const VERDICTS = Object.freeze({
  HONEST_PAIR: 'honest_pair',
  REFUSED_WITH_REASON: 'refused_with_reason',
  PLAN_LIED: 'plan_lied',
  WRONG_PERFORMER: 'wrong_performer',
  STALE_TRACE: 'stale_trace',
  UNRESOLVABLE_REF: 'unresolvable_ref',
  NO_CORPUS: 'no_corpus',
});

/**
 * Класс вердикта СТАТИЧЕН: находка никогда не повышается до остановки,
 * остановка никогда не понижается до находки «по обстоятельствам» (CONCEPT §7).
 * `pass_not_green` — блок не остановка, но и в число зелёных не входит.
 */
export const VERDICT_CLASS = Object.freeze({
  [VERDICTS.HONEST_PAIR]: 'pass',
  [VERDICTS.REFUSED_WITH_REASON]: 'pass_not_green',
  [VERDICTS.PLAN_LIED]: 'stop',
  [VERDICTS.WRONG_PERFORMER]: 'stop',
  [VERDICTS.STALE_TRACE]: 'stop',
  [VERDICTS.UNRESOLVABLE_REF]: 'stop',
  [VERDICTS.NO_CORPUS]: 'stop',
});

/** @type {readonly string[]} */
export const ALL_VERDICTS = Object.freeze(Object.values(VERDICTS));

/** @type {readonly string[]} */
export const STOP_VERDICTS = Object.freeze(
  ALL_VERDICTS.filter((v) => VERDICT_CLASS[v] === 'stop'),
);

/** @param {string} verdict @returns {boolean} */
export function isStopVerdict(verdict) {
  return VERDICT_CLASS[verdict] === 'stop';
}

/** Закрытый список ошибок входа. Ошибка входа => вердиктов НЕТ вовсе. */
export const INPUT_ERRORS = Object.freeze({
  E_PLAN_UNREADABLE: 'E_PLAN_UNREADABLE',
  E_PLAN_NOT_RATIFIED: 'E_PLAN_NOT_RATIFIED',
  E_PLAN_NO_REVISION: 'E_PLAN_NO_REVISION',
  E_PLAN_NO_WINDOW: 'E_PLAN_NO_WINDOW',
  E_PLAN_NO_BLOCKS: 'E_PLAN_NO_BLOCKS',
  E_BLOCK_ID_INVALID: 'E_BLOCK_ID_INVALID',
  E_PERSONA_UNKNOWN: 'E_PERSONA_UNKNOWN',
  E_REASON_UNKNOWN: 'E_REASON_UNKNOWN',
  E_TRACE_KIND_UNKNOWN: 'E_TRACE_KIND_UNKNOWN',
  E_TRACE_FIELDS_MISSING: 'E_TRACE_FIELDS_MISSING',
  E_TRACE_TIME_INVALID: 'E_TRACE_TIME_INVALID',
});

/** @type {readonly string[]} */
export const ALL_INPUT_ERRORS = Object.freeze(Object.values(INPUT_ERRORS));

/** Закрытый список находок (оговорка, вердикта НЕ меняет). Схема имён `eg-<slug>` `//provisional`. */
export const FINDINGS = Object.freeze({
  LATE_CLOSE: 'eg-late-close',
  ORDER_REVIEW_EARLY: 'eg-order-review-early',
  DUPLICATE_TRACE: 'eg-duplicate-trace',
  EXTRA_PERFORMER: 'eg-extra-performer',
});

/**
 * Дисквалификация следа — ОТДЕЛЬНАЯ от находки категория (Phase 2, см. EXPECTATIONS-дельту).
 * Не «находка, повышенная до остановки»: она не меняет вердикт, а УБИРАЕТ след из множества
 * вещдоков. Остановка получается лестницей вердиктов, а не переклассификацией оговорки.
 */
export const DISQUALIFICATIONS = Object.freeze({
  RUN_BEFORE_SIGNATURE: 'eg-run-before-signature',
});

/**
 * Код возврата по итогу прогона. Инвариант (проверяется зубом):
 * code = 0 ⟺ нет остановок ∧ нет ошибок входа ∧ corpusSize > 0 ∧ checkedBlocks > 0.
 *
 * @param {{ verdicts: readonly string[], inputErrors: readonly unknown[], corpusSize: number, checkedBlocks: number }} o
 * @returns {number}
 */
export function resolveExitCode({ verdicts, inputErrors, corpusSize, checkedBlocks }) {
  if (inputErrors.length > 0) return EXIT_NOT_PERFORMED;
  if (verdicts.some((v) => isStopVerdict(v))) return EXIT_NO;
  if (corpusSize <= 0 || checkedBlocks <= 0) return EXIT_NO;
  for (const v of verdicts) {
    if (VERDICT_CLASS[v] === undefined) throw new Error(`Неизвестный вердикт: ${v}`);
  }
  return EXIT_YES;
}
