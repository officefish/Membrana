-- PL2 (pairing-lifecycle): жизненный цикл сопряжения устройства с ключом.
-- pairedKeyId сохраняем для истории/диагностики; статус отражает revoke/unpair.
CREATE TYPE "DevicePairingStatus" AS ENUM ('paired', 'revoked', 'unpaired');

ALTER TABLE "Device"
  ADD COLUMN "pairingStatus" "DevicePairingStatus" NOT NULL DEFAULT 'paired';
