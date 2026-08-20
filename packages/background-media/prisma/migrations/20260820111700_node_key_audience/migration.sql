CREATE TYPE "NodeKeyAudience" AS ENUM ('node', 'client');

ALTER TABLE "NodeKey"
  ADD COLUMN "audience" "NodeKeyAudience" NOT NULL DEFAULT 'node';

CREATE INDEX "NodeKey_deviceId_audience_revokedAt_idx"
  ON "NodeKey"("deviceId", "audience", "revokedAt");
