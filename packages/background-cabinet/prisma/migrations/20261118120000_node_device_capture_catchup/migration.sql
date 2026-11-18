-- #2611 К2 + К3: история миграций догоняет схему (и прод).
-- К2: `NodeDeviceCapture` + enum `DeviceCaptureMode` в schema.prisma с 02.07 (becd70ee), ни одна
--     миграция их не создавала; на проде таблица есть (создана не миграцией, сверено 06.10).
--     Здесь — по `migrate diff` от цепочки к схеме, каждое действие «если ещё нет».
-- К3: снимок `tariff_quota_rename` задавал `datasetCatalogId DEFAULT 'free-v1-catalog'`, в схеме и
--     на проде умолчания нет. DROP DEFAULT на проде — no-op.

DO $$
BEGIN
  IF to_regtype('"DeviceCaptureMode"') IS NULL THEN
    CREATE TYPE "DeviceCaptureMode" AS ENUM ('soft', 'hard');
  END IF;
END $$;

ALTER TABLE "Tariff" ALTER COLUMN "datasetCatalogId" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "NodeDeviceCapture" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "mediaDeviceId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "mode" "DeviceCaptureMode" NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeDeviceCapture_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NodeDeviceCapture_nodeId_key" ON "NodeDeviceCapture"("nodeId");
CREATE INDEX IF NOT EXISTS "NodeDeviceCapture_expiresAt_idx" ON "NodeDeviceCapture"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "NodeDeviceCapture_membraneId_mediaDeviceId_key" ON "NodeDeviceCapture"("membraneId", "mediaDeviceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NodeDeviceCapture_membraneId_fkey') THEN
    ALTER TABLE "NodeDeviceCapture" ADD CONSTRAINT "NodeDeviceCapture_membraneId_fkey" FOREIGN KEY ("membraneId") REFERENCES "Membrane"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NodeDeviceCapture_nodeId_fkey') THEN
    ALTER TABLE "NodeDeviceCapture" ADD CONSTRAINT "NodeDeviceCapture_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NodeDeviceCapture_sessionId_fkey') THEN
    ALTER TABLE "NodeDeviceCapture" ADD CONSTRAINT "NodeDeviceCapture_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
