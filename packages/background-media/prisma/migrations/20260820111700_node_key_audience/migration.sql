CREATE TYPE "NodeKeyAudience" AS ENUM ('node', 'client');

ALTER TABLE "NodeKey"
  ADD COLUMN "audience" "NodeKeyAudience";

UPDATE "NodeKey"
  SET "audience" = 'node'
  WHERE "audience" IS NULL;

ALTER TABLE "NodeKey"
  ALTER COLUMN "audience" SET DEFAULT 'node',
  ALTER COLUMN "audience" SET NOT NULL;

CREATE INDEX "NodeKey_deviceId_audience_revokedAt_idx"
  ON "NodeKey"("deviceId", "audience", "revokedAt");
