-- v1 #2333: tariff contract version is a cabinet tariff scalar and a fanout source.
ALTER TABLE "Tariff" ADD COLUMN "tariffContractVersion" INTEGER NOT NULL DEFAULT 1;
