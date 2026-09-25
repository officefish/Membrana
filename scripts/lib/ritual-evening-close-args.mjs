/**
 * Аргументы `procedure-run-record close` для вечерней цепочки — чистая сборка.
 *
 * #2081 (хвост после #2171): статус close считается ПО ФАКТУ прогона, а находки
 * (шаги-репортёры с ненулевым кодом из findingExitCodes — например deliver-to-main
 * pending-ci, exit 3) обязаны попасть В ЖУРНАЛ, а не только в консоль: иначе «PR ждёт
 * CI» остаётся сиротой, которую назавтра закрывает orphaned следующего open.
 * Находка не роняет статус (pass), но записывается во friction с кодом и шагом.
 *
 * ── #2413: у отказа шага рождается ТРЕНИЕ, не только gap ────────────────────────
 *
 * `gap` и `friction` — разные вещи, и до 25.09 упавший шаг попадал только в первую.
 *
 *   `gap`      — дыра в ПОКРЫТИИ прогона: имя того, что этот прогон не покрыл.
 *                Свойство карты покрытия, утверждение о самом прогоне.
 *   `friction` — НАБЛЮДЕНИЕ о мире: симптом + долг {корень, фикс, профилактика}.
 *                Живёт дольше прогона: корень дозаписывается амандментом потом.
 *
 * Упавший шаг по этому различению — И ТО, И ДРУГОЕ: он оставляет дыру в покрытии
 * (gap) и он же есть наблюдение с ИЗВЕСТНЫМ симптомом и НЕИЗВЕСТНЫМ корнем
 * (friction, `root: null`). Находка — наоборот: покрытие есть, трение есть.
 *
 * Цена пропуска (вещдок 2026-09-24): вечер закрылся `fail` с
 * `gaps:["code-review","archive-code-review","deliver-to-main"]` — три критичных
 * отказа — и с тремя трениями, рождёнными ТОЛЬКО находками exit 3. Дайджест считает
 * непогашенные трения по `friction[]` и про `gaps` в этой графе молчит; поэтому день
 * с тремя отказами читается как день, где трений нет. Ложь не в счёте — счёт честен;
 * ложь в том, что отказу нечего было считать.
 *
 * Рождение записи — забота `close`: `friction-amend` по построению умеет лишь ПРАВИТЬ
 * существующий `friction[i]` по (runId, sequence, frictionIndex) и требует evidence.
 * Ни один амандмент не создаёт того, чего close не родил.
 *
 * Порядок: сначала трения отказов, затем находок. Порядок фиксирован, потому что
 * `frictionIndex` амандмента — позиция в этом массиве; плавающий порядок сделал бы
 * адрес поправки неустойчивым.
 *
 * @param {{ failed: Array<{id: string, exitCode?: number|null}>, findings: Array<{id: string, exitCode?: number|null}>, evidence?: string }} p
 * @returns {string[]}
 */
export function eveningCloseArgs({ failed, findings, evidence = 'docs/HANDOFF.md' }) {
  const closeStatus = failed.length > 0 ? 'fail' : 'pass';
  return [
    'close',
    '--procedure',
    'ritual-evening',
    '--status',
    closeStatus,
    '--evidence',
    evidence,
    ...failed.flatMap((f) => ['--gap', f.id]),
    ...failed.flatMap((f) => ['--friction', failureSymptom(f)]),
    ...findings.flatMap((f) => ['--friction', `${f.id}: finding exit ${f.exitCode ?? '?'}`]),
  ];
}

/**
 * Симптом трения, рождённого отказом шага. Слово «отказ» в тексте — не украшение:
 * читатель ленты обязан отличать его от «finding exit N» БЕЗ обращения к gaps.
 *
 * @param {{ id: string, exitCode?: number|null }} f
 * @returns {string}
 */
export function failureSymptom(f) {
  return `${f.id}: отказ шага, exit ${f.exitCode ?? '?'} (корень не назван)`;
}
