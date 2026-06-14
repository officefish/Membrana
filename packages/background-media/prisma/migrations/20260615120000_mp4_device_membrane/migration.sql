-- MP4: per-membrane device scope and tariff quota fields on media Device.

ALTER TABLE "Device" ADD COLUMN "membraneId" UUID;
ALTER TABLE "Device" ADD COLUMN "userStorageQuotaBytes" BIGINT;
ALTER TABLE "Device" ADD COLUMN "bufferQuotaBytes" BIGINT;
ALTER TABLE "Device" ADD COLUMN "datasetCatalogId" TEXT;

CREATE INDEX "Device_membraneId_idx" ON "Device"("membraneId");
