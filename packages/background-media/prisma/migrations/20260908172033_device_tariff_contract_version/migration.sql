-- v1 #2333: device-side snapshot of the cabinet tariff contract version.
ALTER TABLE "Device" ADD COLUMN "tariffContractVersion" INTEGER NOT NULL DEFAULT 1;
