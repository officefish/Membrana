/**
 * Замороженный enum РОДОВ СЛЕДА ИСПОЛНЕНИЯ — единственный источник истины состава.
 *
 * Список закрыт покрытием оси окна работы (CONCEPT §2): у окна четыре момента
 * (до старта · на входе · по ходу · на выходе), в каждом ровно один акт, который
 * исполнитель не может произвести, не будучи исполнителем. Пятый род потребовал бы
 * пятого момента — моментов четыре.
 *
 * Род вне списка — НЕ «прочее» и НЕ слабый след: это ошибка входа
 * (`E_TRACE_KIND_UNKNOWN`), гейт вердиктов не выносит вовсе. Тихое игнорирование
 * даёт ложный красный, тихий приём — обход гейта НОВЫМ СЛОВОМ.
 *
 * Зеркало для человека — `docs/sprint/gate/TRACE_KINDS.md`; расхождение зеркала
 * с этим enum ловится зубом в `scripts/execution-gate.test.mjs`.
 *
 * Слаги родов — `//provisional`: сами четыре рода названы брифом, слаги мои.
 */

export const TRACE_KINDS = Object.freeze({
  CONTRACT_SIGNATURE: 'contract_signature',
  SESSION_PREP: 'session_prep',
  CONTEXT_RUN: 'context_run',
  REVIEW_PASS: 'review_pass',
});

/**
 * Канонический порядок событий окна: contract_signature ≺ session_prep ≺ context_run ≺ review_pass.
 * Порядок несущий — по нему считаются находки порядка и дисквалификация прогона до подписи.
 * @type {readonly string[]}
 */
export const TRACE_KIND_ORDER = Object.freeze([
  TRACE_KINDS.CONTRACT_SIGNATURE,
  TRACE_KINDS.SESSION_PREP,
  TRACE_KINDS.CONTEXT_RUN,
  TRACE_KINDS.REVIEW_PASS,
]);

/** Момент окна, который род покрывает (для отчёта и доки-зеркала). */
export const TRACE_KIND_MOMENT = Object.freeze({
  [TRACE_KINDS.CONTRACT_SIGNATURE]: 'до старта',
  [TRACE_KINDS.SESSION_PREP]: 'на входе',
  [TRACE_KINDS.CONTEXT_RUN]: 'по ходу',
  [TRACE_KINDS.REVIEW_PASS]: 'на выходе',
});

/**
 * Есть ли у рода носитель в репозитории СЕГОДНЯ.
 * `false` = род объявлен, носителя нет, читается только через стаб `//provisional`.
 * Это честное «нет», а не тихое исключение рода из списка: выдумывать носитель запрещено.
 */
export const TRACE_KIND_CARRIER_EXISTS = Object.freeze({
  [TRACE_KINDS.CONTRACT_SIGNATURE]: false,
  [TRACE_KINDS.SESSION_PREP]: false,
  [TRACE_KINDS.CONTEXT_RUN]: true,
  [TRACE_KINDS.REVIEW_PASS]: true,
});

/** @param {unknown} kind @returns {boolean} */
export function isKnownTraceKind(kind) {
  return TRACE_KIND_ORDER.includes(/** @type {string} */ (kind));
}

/** Позиция рода в каноническом порядке; -1 для неизвестного. @param {string} kind */
export function kindRank(kind) {
  return TRACE_KIND_ORDER.indexOf(kind);
}
