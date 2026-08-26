/**
 * Закрытие журнала утреннего прогона — чистая сборка аргументов (#1782).
 *
 * ПОВОД. У утра был `journal-open` шагом, а закрытие — хвостом shell-цепочки с
 * КОНСТАНТОЙ `pass`: `open … && …15 звеньев… && close --status pass`. Отсюда два
 * конструктивных дефекта. Первый: `&&` — оборвалось звено, и закрытия нет вовсе;
 * запись висит сиротой, а следующий прогон закрывает её лениво как `fail`, вписывая
 * в журнал провал, которого не было (вещдок 07.08: утро отработало, магистраль
 * выбрана, артефакты доставлены — а в журнале второй прогон без закрывающей записи).
 * Второй: константа `pass` — журнал не различал исходы.
 *
 * #2171 дал утру JS-раннер и закрытие по факту в трёх ветках. Здесь закрывается
 * остаток: сборка аргументов становится чистой (её судит зуб), а само закрытие —
 * ГАРАНТИРОВАННЫМ: исключение внутри цепочки больше не уносит запись с собой.
 */

export const DAY_PROCEDURE_ID = 'ritual-day';
export const DAY_CLOSE_EVIDENCE = 'docs/MAIN_DAY_ISSUE.md';

/**
 * Аргументы `procedure-run-record close` по исходу утра.
 *
 * - `pass` — цепочка дошла до конца;
 * - `skipped` + gap `deliver-to-main:pending-ci` — доставка ждёт CI (исход #2081):
 *   это хвост, а не провал ритуала и не доставка;
 * - `fail` + gap с ИМЕНЕМ шага — упал критичный шаг;
 * - `fail` + gap `chain-aborted` — цепочка оборвалась исключением: запись всё равно
 *   закрывается, потому что «сирота» лжёт следующему прогону.
 *
 * @param {{ outcome: 'pass'|'pending-ci'|'failed'|'aborted', stepId?: string|null, tail?: string|null }} p
 * @returns {string[]}
 */
export function dayCloseArgs({ outcome, stepId, tail }) {
  const status = outcome === 'pass' ? 'pass' : outcome === 'pending-ci' ? 'skipped' : 'fail';
  const args = ['close', '--procedure', DAY_PROCEDURE_ID, '--status', status, '--evidence', DAY_CLOSE_EVIDENCE];
  if (outcome === 'pending-ci') {
    args.push('--gap', 'deliver-to-main:pending-ci');
    if (tail) args.push('--friction', tail);
    return args;
  }
  if (outcome === 'failed') {
    args.push('--gap', stepId ?? 'unknown-step');
    return args;
  }
  if (outcome === 'aborted') {
    // Обрыв — не «успех» и не «шаг упал»: у провала есть имя, и это имя обрыва.
    args.push('--gap', 'chain-aborted');
    if (tail) args.push('--friction', tail);
  }
  return args;
}

/**
 * Симметрия манифеста: если у утра есть шаг открытия журнала, обязан быть и шаг
 * закрытия. Проверяется зубом — иначе закрытие снова уедет в хвост оболочки.
 *
 * @param {Array<{id?: string}>} steps
 * @returns {string|null} текст находки либо null
 */
export function manifestCloseProblem(steps) {
  const ids = (steps ?? []).map((s) => s?.id);
  if (!ids.includes('journal-open')) return null;
  if (ids.includes('journal-close')) return null;
  return 'манифест утра несёт journal-open без journal-close: закрытие снова живёт вне процедуры (#1782)';
}
