/**
 * sprint-run — словарь прогона спринта в журнале процедур (блок a1-dictionary-move,
 * спринт `sprint-dictionary-to-lib`, #1681; класс acts-trail-reader #1638).
 *
 * До переезда словарь жил в scripts/sprint-cut-check.mjs, и execution-gate.mjs
 * импортировал его скрипт-к-скрипту — «тайное API». Здесь оба конца шва (open при
 * ратификации, close вердиктом гейта) берут ОДИН procedureId и ОДИН вывод пути ленты
 * из ОДНОГО поля (`ratification.at`) — расходиться им не из чего.
 *
 * Границы (разбор Ожегова, docs/discussions/block-a1-dictionary-move-ozhegov.md):
 * утилита scripts/lib, не сервис; импорт lib-к-lib (procedure-run-journal) законен;
 * обратный импорт из скриптов сюда запрещён — цикл lib → скрипт ловится ревью.
 */
import { defaultTrailPath, findUnclosedRuns, openProcedureRun, readProcedureRunTrail } from '../procedure-run-journal.mjs';

/**
 * Прогон спринта в журнале процедур (блок sprint-producer, 03.08). Словарь ленты:
 * `procedureId = "membrana-local-sprint"` — имя уже в ленте 03.08, второй диалект не
 * заводится; `runId = sprintId` (DoD блока 2).
 */
export const SPRINT_PROCEDURE_ID = 'membrana-local-sprint';

/** Лента выводится из ратификации, не из часов процесса: open и close ищут один файл. */
export function sprintTrailRelPath(plan) {
  const at = plan?.ratification?.at;
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(at)) {
    throw new Error('план без читаемой ratification.at — журнальная лента не выводится');
  }
  return defaultTrailPath(at.slice(0, 10));
}

/**
 * Обеспечить open-запись прогона спринта. Идемпотентность — буква DoD: повторный вызов
 * находит открытую (или уже закрытую) и второй не плодит. `at` open-записи — время
 * ратификации ИЗ ПЛАНА: прогон спринта начинается словом владельца, не запуском CLI.
 *
 * Известный предел (#1705): open нового спринта лениво закрывает незакрытые прогоны
 * той же процедуры, не различая параллельный соседний спринт — вторую ратификацию
 * при живом open соседа делать нельзя.
 *
 * @param {string} repoRoot
 * @param {object} plan ратифицированный план (schema sprint-cut/1)
 * @param {string} planRelPath путь плана от корня — вещдок open-записи (manifestRef)
 * @returns {{opened: boolean, reason: string, record?: object, orphansClosed?: object[]}}
 */
export function ensureSprintRunOpen(repoRoot, plan, planRelPath) {
  const sprintId = plan?.sprintId;
  if (typeof sprintId !== 'string' || sprintId.trim() === '') {
    throw new Error('план без sprintId — прогону нечем зваться');
  }
  const trailRel = sprintTrailRelPath(plan);
  const records = readProcedureRunTrail(repoRoot, trailRel);
  if (records.some((r) => r?.runPhase === 'close' && r.runId === sprintId)) {
    return { opened: false, reason: 'прогон уже закрыт — спринт прожит, запись стоит' };
  }
  if (findUnclosedRuns(records, SPRINT_PROCEDURE_ID).some((r) => r.runId === sprintId)) {
    return { opened: false, reason: 'open-запись уже в ленте — вторая была бы второй правдой' };
  }
  const { record, orphansClosed } = openProcedureRun(repoRoot, trailRel, {
    // Область `run` (#1705): спринты живут параллельно законно, и ратификация нового
    // НЕ должна хоронить соседний живой прогон. Свой оборванный прогон при этом
    // по-прежнему закрывается — область сужает круг сирот, а не отменяет их.
    lazyCloseScope: 'run',
    procedureId: SPRINT_PROCEDURE_ID,
    runId: sprintId,
    subject: `спринт ${sprintId}: ратифицирован владельцем (${plan.ratification.by}), блоков ${Array.isArray(plan.blocks) ? plan.blocks.length : 0}`,
    at: plan.ratification.at,
    evidence: [planRelPath],
  });
  return { opened: true, reason: 'open-запись создана инструментом', record, orphansClosed };
}
