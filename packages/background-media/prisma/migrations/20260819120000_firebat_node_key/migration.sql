-- ADR-0027 Р3 (b2 firebat-node-device, #1998): ключ полевого узла — отдельная сущность
-- жизненного цикла (выдать · сменить · отозвать); хранится только sha256-хеш сырого ключа.
CREATE TABLE "NodeKey" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "NodeKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NodeKey_keyHash_key" ON "NodeKey"("keyHash");

CREATE INDEX "NodeKey_deviceId_revokedAt_idx" ON "NodeKey"("deviceId", "revokedAt");

ALTER TABLE "NodeKey" ADD CONSTRAINT "NodeKey_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
