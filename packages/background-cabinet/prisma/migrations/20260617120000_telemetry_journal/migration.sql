-- MP5: cloud telemetry journal (reports + live records per membrane).

CREATE TYPE "TelemetryLiveStatus" AS ENUM ('active', 'ended');

CREATE TABLE "TelemetryReport" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "nodeId" UUID,
    "mediaDeviceId" UUID,
    "reportKind" TEXT NOT NULL,
    "moduleId" TEXT,
    "moduleName" TEXT,
    "clientEntryId" TEXT,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelemetryLiveRecord" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "nodeId" UUID,
    "mediaDeviceId" UUID,
    "recordKind" TEXT NOT NULL,
    "moduleId" TEXT,
    "clientRecordId" TEXT,
    "status" "TelemetryLiveStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelemetryLiveRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelemetryReport_membraneId_finishedAt_idx" ON "TelemetryReport"("membraneId", "finishedAt" DESC);

CREATE UNIQUE INDEX "TelemetryReport_membraneId_clientEntryId_key" ON "TelemetryReport"("membraneId", "clientEntryId");

CREATE INDEX "TelemetryLiveRecord_membraneId_status_startedAt_idx" ON "TelemetryLiveRecord"("membraneId", "status", "startedAt" DESC);

CREATE UNIQUE INDEX "TelemetryLiveRecord_membraneId_clientRecordId_key" ON "TelemetryLiveRecord"("membraneId", "clientRecordId");

ALTER TABLE "TelemetryReport" ADD CONSTRAINT "TelemetryReport_membraneId_fkey" FOREIGN KEY ("membraneId") REFERENCES "Membrane"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelemetryLiveRecord" ADD CONSTRAINT "TelemetryLiveRecord_membraneId_fkey" FOREIGN KEY ("membraneId") REFERENCES "Membrane"("id") ON DELETE CASCADE ON UPDATE CASCADE;
