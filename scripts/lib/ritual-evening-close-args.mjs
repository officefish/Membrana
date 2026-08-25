/**
 * Аргументы `procedure-run-record close` для вечерней цепочки — чистая сборка.
 *
 * #2081 (хвост после #2171): статус close считается ПО ФАКТУ прогона, а находки
 * (шаги-репортёры с ненулевым кодом из findingExitCodes — например deliver-to-main
 * pending-ci, exit 3) обязаны попасть В ЖУРНАЛ, а не только в консоль: иначе «PR ждёт
 * CI» остаётся сиротой, которую назавтра закрывает orphaned следующего open.
 * Находка не роняет статус (pass), но записывается во friction с кодом и шагом.
 *
 * @param {{ failed: Array<{id: string}>, findings: Array<{id: string, exitCode?: number|null}>, evidence?: string }} p
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
    ...findings.flatMap((f) => ['--friction', `${f.id}: finding exit ${f.exitCode ?? '?'}`]),
  ];
}
