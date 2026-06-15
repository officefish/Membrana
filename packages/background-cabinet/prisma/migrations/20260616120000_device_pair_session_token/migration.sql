-- Store last pairing session token on Device for revoke → immediate client unlink.

ALTER TABLE "Device" ADD COLUMN "lastPairSessionToken" TEXT;

CREATE UNIQUE INDEX "Device_lastPairSessionToken_key" ON "Device"("lastPairSessionToken");
CREATE INDEX "Device_pairedKeyId_idx" ON "Device"("pairedKeyId");
