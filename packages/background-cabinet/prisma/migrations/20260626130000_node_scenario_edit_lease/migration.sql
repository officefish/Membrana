-- Server-first SF3: edit lease per (membraneId, mediaDeviceId)
CREATE TABLE "NodeScenarioEditLease" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "mediaDeviceId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeScenarioEditLease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NodeScenarioEditLease_nodeId_key" ON "NodeScenarioEditLease"("nodeId");
CREATE UNIQUE INDEX "NodeScenarioEditLease_membraneId_mediaDeviceId_key" ON "NodeScenarioEditLease"("membraneId", "mediaDeviceId");
CREATE INDEX "NodeScenarioEditLease_expiresAt_idx" ON "NodeScenarioEditLease"("expiresAt");

ALTER TABLE "NodeScenarioEditLease" ADD CONSTRAINT "NodeScenarioEditLease_membraneId_fkey" FOREIGN KEY ("membraneId") REFERENCES "Membrane"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NodeScenarioEditLease" ADD CONSTRAINT "NodeScenarioEditLease_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NodeScenarioEditLease" ADD CONSTRAINT "NodeScenarioEditLease_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
