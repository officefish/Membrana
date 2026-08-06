/**
 * Дом ядра выравнивания деревьев — единственный вход для исполнителей и CLI
 * (спринт `worktrees-align`, #1738).
 *
 * ЗАЧЕМ БАРРЕЛЬ. Блоки снимка, merge и CLI обязаны видеть ОДИН словарь действий и ОДНИ
 * предикаты состояния. Прямой импорт по внутренним файлам разрешил бы каждому взять свой
 * кусок и со временем завести синоним — ровно та болезнь, от которой `acts-trail-reader`
 * выносили из `sprint-cut-check` (разбор Ожегова 03.08): третий потребитель рождает второго
 * читателя-синонима, которого потом сводить ADR-ом.
 *
 * Скрипты — исполняемые точки входа, не библиотеки: импорт скрипт-к-скрипту здесь запрещён,
 * общий дом только тут.
 */
export {
  ALIGN_ACTIONS,
  ALIGN_ACTION_ORDER,
  IN_PROGRESS_HEADS,
  SKIP_REASONS,
  formatAlignReport,
  hasInProgressOp,
  hasTrackedDeletions,
  hasMergeHead,
  isBehind,
  isDirty,
  isDiverged,
  isFastForward,
  isWorktreeClean,
  needsHuman,
  planAlign,
  planTree,
  recordConflict,
  recordSnapshot,
} from './align-plan.mjs';
