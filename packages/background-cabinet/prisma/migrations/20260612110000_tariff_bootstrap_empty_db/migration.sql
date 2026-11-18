-- #2611 К1 (1/3): цепочка кабинета на ПУСТУЮ БД.
-- `20260612120000_tariff_quota_rename` датирована раньше `20260614120000_mp2_domain`, которая
-- создаёт "Tariff"; на пустой БД переименование падало P3018 (relation "Tariff" does not exist).
-- Применённые на проде миграции не правятся (имя и checksum в `_prisma_migrations`), поэтому
-- порядок чинится тремя НОВЫМИ миграциями, каждая — no-op на базе, где "Tariff" уже есть:
--   1/3 (эта)  — нет "Tariff" → временная таблица-подставка с меткой, чтобы переименование прошло;
--   2/3        — `20260612120001_tariff_bootstrap_drop`: снять подставку (только по метке);
--   3/3        — `20260614120001_tariff_quota_rename_replay`: повторить переименование после mp2_domain.
-- Прод: "Tariff" есть → ничего не делает.
DO $$
BEGIN
  IF to_regclass('"Tariff"') IS NULL THEN
    CREATE TABLE "Tariff" ("datasetQuotaBytes" BIGINT);
    COMMENT ON TABLE "Tariff" IS 'membrana-2611-bootstrap';
  END IF;
END $$;
