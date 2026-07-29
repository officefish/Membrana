-- S8 плана интеграции тарифной сетки (заседание tariff-grid, 29.07):
-- носители смены тарифа. Журнал append-only, промокод одноразовый.

CREATE TYPE "TariffChangeProof" AS ENUM ('admin', 'promo');
CREATE TYPE "PromoCodeStatus" AS ENUM ('active', 'spent', 'revoked');

CREATE TABLE "TariffChangeLog" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "fromTariffId" TEXT NOT NULL,
    "toTariffId" TEXT NOT NULL,
    "proofType" "TariffChangeProof" NOT NULL,
    "proofRef" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TariffChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TariffChangeLog_membraneId_idx" ON "TariffChangeLog"("membraneId");
CREATE INDEX "TariffChangeLog_at_idx" ON "TariffChangeLog"("at");

CREATE TABLE "PromoCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "targetTariffId" TEXT NOT NULL,
    "status" "PromoCodeStatus" NOT NULL DEFAULT 'active',
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByMembraneId" UUID,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_status_idx" ON "PromoCode"("status");
