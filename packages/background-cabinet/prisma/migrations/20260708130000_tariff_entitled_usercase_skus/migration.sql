-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "entitledTariffSkus" TEXT[] DEFAULT ARRAY[]::TEXT[];
