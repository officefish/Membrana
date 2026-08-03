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
  /**
   * Часть вещдоков блока судила ДРУГУЮ вещь (акт владельца 01.08, восьмой вердикт).
   *
   * До него `stale_trace` выносился, только если протухли ВСЕ следы блока. Уцелел хоть
   * один — протухшие молча выпадали из `evidenceRefs`, а вердикт оставался `honest_pair`.
   * Вещдок #1566: родитель разобран, из него нарезаны три ребёнка, прогон контекста остался
   * один — и все три получили `honest_pair` на разборе вещи, которой в той форме не
   * существовало. Формулировка issue: «honest_pair слабее, чем читается».
   *
   * Список остаётся закрытым — он стал из восьми, а не открылся.
   */
  STALE_PARTIAL: 'stale_partial',
  UNRESOLVABLE_REF: 'unresolvable_ref',
  NO_CORPUS: 'no_corpus',
  /**
   * След валиден и свеж, но состав родов неполон (#1641, девятый вердикт — решение резчика
   * 03.08 из развилки иссью).
   *
   * До него `honest_pair` выносился при ЛЮБОМ числе валидных следов, включая один: условие
   * было `resolvable.length > 0`, состав родов не проверялся вообще. Вещдок 02.08 — блок
   * `report-surfacing-wire` с одним `review_pass`, без прогона контекста, прошёл зелёным и в
   * итоговой строке был неотличим от полностью честного. Фактическая парность держалась на
   * дисциплине докладчика, а не на предикате: замер 03.08 дал 124 полных пары из 125 блоков,
   * и перекрашивается этим вердиктом ровно один — сам вещдок.
   *
   * Класс `stop`, не `pass_not_green`: неполный след — «несыгранный матч при сданной
   * тренировке», и мягкий класс был бы той же ложью тоном ниже (слово резчика). Имя не
   * `partial_evidence`: слово «partial» занято семантикой `stale_partial`, где частична
   * СВЕЖЕСТЬ, а здесь — СОСТАВ.
   *
   * Список остаётся закрытым — он стал из девяти, а не открылся.
   */
  INCOMPLETE_TRACE: 'incomplete_trace',
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
  [VERDICTS.STALE_PARTIAL]: 'stop',
  [VERDICTS.UNRESOLVABLE_REF]: 'stop',
  [VERDICTS.NO_CORPUS]: 'stop',
  [VERDICTS.INCOMPLETE_TRACE]: 'stop',
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
  /**
   * Пара находок порядка — различие по ОПОРНОЙ ТОЧКЕ (словарь Ожегова, шот pair-props 03.08):
   * ревью раньше подписи субъекта против ревью раньше его прогона контекста. Прежнее имя
   * ORDER_REVIEW_EARLY переименовано: «early» не несло опоры — раньше ЧЕГО, — и с появлением
   * второй точки стало бы неразличимо. Алиаса нет: строку-ключ вне репозитория не читает никто.
   */
  ORDER_REVIEW_BEFORE_SIGN: 'eg-order-review-before-sign',
  /**
   * Ревью раньше ПЕРВОГО прогона контекста того же субъекта (#1641, свойство 1 разбора пары):
   * пара формально полна, но ревью судило работу до того, как исполнитель взял контекст.
   * Семантика «первого» несущая: «последнего до ревью» тихо разрешал бы
   * «прогнали → отревьюили → прогнали ещё раз», а это другое свойство (ревизия между
   * следами), закрытое композицией #1641+#1638 — не смешивать.
   */
  ORDER_REVIEW_BEFORE_RUN: 'eg-order-review-before-run',
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
  /**
   * Протухший след отозван актом перерезки (#1638, вторая категория — акт 03.08).
   *
   * До неё честная перерезка жила в тупике: `revisionAt` двигался инструментом, прежний след
   * протухал, контекст прогонялся заново — а `stale_partial` вставал всё равно, и очистить его
   * можно было только изъятием строки из ленты руками. Разведка 03.08 показала, что тупик уже
   * срабатывал молча: след `tr-port-vesnin-run-v1` (спринт `subconscious-lift-c3`) не существует
   * даже в git-истории — ленту почистили до первого коммита.
   *
   * Дисквалификация, а не изъятие: лента неприкосновенна, отзыв печатается поимённо с датой
   * акта — аудит остаётся. Условия отзыва — в `supersededByRecut` (predicates.mjs), и главное
   * из них ВРЕМЕННОЕ: акт обязан лежать между протухшим следом и ревизией. Голый факт «в ленте
   * есть recut_act» легализовал бы старый акт на весь спринт (слово резчика 03.08).
   */
  SUPERSEDED_BY_RECUT: 'eg-superseded-by-recut',
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
