/**
 * Словарь журнала уборщика холодного архива (#2632 g1a; консилиум archive-gc-journal-2026-10-08,
 * вердикты 1–5) — ЕДИНСТВЕННОЕ место чеканки литералов прогона, задания и исхода по пути.
 * Образец — `downgrade-archive.vocabulary.ts`: литералы пишет один файл, потребители (хранилище g1b,
 * политика повторов g3a, исполнитель g3b, двери g4) импортируют.
 *
 * purge-journal ≠ downgrade-archive: архив отвечает «что заморожено», журнал — «что и как уборщик
 * удалил и чем это доказано». Списки ниже обязаны совпадать с enum'ами `prisma/schema.prisma` и
 * `CREATE TYPE` миграции `…_cold_archive_purge_journal` — равенство держит `purge-journal.schema.test.ts`.
 */

/** Кто разбудил прогон: ежечасный cron office, панель, ручной вызов. */
export const PURGE_RUN_TRIGGERS = ['cron', 'panel', 'manual'] as const;
export type PurgeRunTrigger = (typeof PURGE_RUN_TRIGGERS)[number];

/** Режим прогона. `dry_run` пишет прогон и задания со снимком и исходом «было бы», без rm. */
export const PURGE_RUN_MODES = ['dry_run', 'live'] as const;
export type PurgeRunMode = (typeof PURGE_RUN_MODES)[number];

/** Исход прогона. `abandoned` — оборван рестартом, помечается на старте следующего прогона. */
export const PURGE_RUN_STATUSES = ['running', 'succeeded', 'failed', 'abandoned'] as const;
export type PurgeRunStatus = (typeof PURGE_RUN_STATUSES)[number];

/** Предмет задания: партия целиком или осиротевший файл (долг между прогонами). */
export const PURGE_JOB_TARGETS = ['batch', 'orphan_blob'] as const;
export type PurgeJobTarget = (typeof PURGE_JOB_TARGETS)[number];

/** Состояние задания. `dead_letter` — попытки исчерпаны, долг виден в панели (Т2). */
export const PURGE_JOB_STATUSES = ['pending', 'claimed', 'succeeded', 'retry', 'dead_letter'] as const;
export type PurgeJobStatus = (typeof PURGE_JOB_STATUSES)[number];

/**
 * Исход удаления ОДНОГО пути (вердикт 3, доказательство v1 = stat до и после):
 * `removed` — файл был и исчез; `already_absent` — файла не было до rm; `failed` — файл остался
 * (в том числе `afterExists = true` после rm). Хранится в `ColdArchivePurgeJob.outcomes` (jsonb),
 * отдельного enum в БД нет.
 */
export const PURGE_PATH_ACTIONS = ['removed', 'already_absent', 'failed'] as const;
export type PurgePathAction = (typeof PURGE_PATH_ACTIONS)[number];

/** Запись `outcomes[storageRef]` задания. */
export interface PurgePathOutcome {
  readonly beforeExists: boolean;
  readonly afterExists: boolean;
  readonly action: PurgePathAction;
}
