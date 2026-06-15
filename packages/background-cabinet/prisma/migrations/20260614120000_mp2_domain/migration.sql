-- MP2: Tariff, Membrane, Node, NodeAccessKey
CREATE TYPE "NodeAccessKeyDuration" AS ENUM ('hours_4', 'days_3', 'weeks_2', 'month_1', 'months_3');

CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "datasetQuotaBytes" BIGINT NOT NULL,
    "bufferQuotaBytes" BIGINT NOT NULL,
    "maxActiveKeysPerNode" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membrane" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tariffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membrane_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Node" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NodeAccessKey" (
    "id" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "secretHash" TEXT NOT NULL,
    "duration" "NodeAccessKeyDuration" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeAccessKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Membrane_userId_key" ON "Membrane"("userId");
CREATE INDEX "Membrane_tariffId_idx" ON "Membrane"("tariffId");
CREATE UNIQUE INDEX "Node_membraneId_key" ON "Node"("membraneId");
CREATE INDEX "NodeAccessKey_nodeId_idx" ON "NodeAccessKey"("nodeId");
CREATE INDEX "NodeAccessKey_expiresAt_idx" ON "NodeAccessKey"("expiresAt");

ALTER TABLE "Membrane" ADD CONSTRAINT "Membrane_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membrane" ADD CONSTRAINT "Membrane_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Node" ADD CONSTRAINT "Node_membraneId_fkey" FOREIGN KEY ("membraneId") REFERENCES "Membrane"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NodeAccessKey" ADD CONSTRAINT "NodeAccessKey_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
