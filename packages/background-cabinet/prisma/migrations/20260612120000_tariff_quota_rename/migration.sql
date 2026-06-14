-- Rename misleading datasetQuotaBytes → userStorageQuotaBytes; add tariff dataset catalog id.

ALTER TABLE "Tariff" RENAME COLUMN "datasetQuotaBytes" TO "userStorageQuotaBytes";

ALTER TABLE "Tariff" ADD COLUMN "datasetCatalogId" TEXT NOT NULL DEFAULT 'free-v1-catalog';

UPDATE "Tariff" SET "datasetCatalogId" = 'free-v1-catalog' WHERE "datasetCatalogId" = 'free-v1-catalog';
