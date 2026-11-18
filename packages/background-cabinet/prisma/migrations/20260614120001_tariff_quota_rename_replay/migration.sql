-- #2611 К1 (3/3): повтор `20260612120000_tariff_quota_rename` ПОСЛЕ `20260614120000_mp2_domain`.
-- На пустой БД переименование отработало по подставке (снята в 2/3), и настоящий "Tariff" из
-- mp2_domain пришёл со старым именем столбца. На проде переименование давно применено — здесь
-- обе ветки ложны, миграция ничего не делает.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Tariff' AND column_name = 'datasetQuotaBytes'
  ) THEN
    ALTER TABLE "Tariff" RENAME COLUMN "datasetQuotaBytes" TO "userStorageQuotaBytes";
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Tariff' AND column_name = 'datasetCatalogId'
  ) THEN
    ALTER TABLE "Tariff" ADD COLUMN "datasetCatalogId" TEXT NOT NULL DEFAULT 'free-v1-catalog';
  END IF;
END $$;
