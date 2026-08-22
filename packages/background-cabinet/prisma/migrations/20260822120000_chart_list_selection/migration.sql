-- CreateTable
CREATE TABLE "ChartListSelection" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "criterion" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "runId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "asked" INTEGER NOT NULL,
    "measured" INTEGER NOT NULL,
    "shortfall" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartListSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartListPick" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "entryId" UUID NOT NULL,
    "sampleId" TEXT NOT NULL,
    "deltaDb" DOUBLE PRECISION NOT NULL,
    "peakDb" DOUBLE PRECISION NOT NULL,
    "structure" TEXT NOT NULL,
    "flatness" DOUBLE PRECISION NOT NULL,
    "displaced" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChartListPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChartListSelection_membraneId_createdAt_idx" ON "ChartListSelection"("membraneId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ChartListPick_selectionId_rank_key" ON "ChartListPick"("selectionId", "rank");

-- AddForeignKey
ALTER TABLE "ChartListSelection" ADD CONSTRAINT "ChartListSelection_membraneId_fkey" FOREIGN KEY ("membraneId") REFERENCES "Membrane"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartListPick" ADD CONSTRAINT "ChartListPick_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "ChartListSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

