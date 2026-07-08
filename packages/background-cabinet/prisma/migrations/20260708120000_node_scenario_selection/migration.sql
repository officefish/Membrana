-- CreateTable
CREATE TABLE "NodeScenarioSelection" (
    "mediaDeviceId" TEXT NOT NULL,
    "membraneId" UUID NOT NULL,
    "scenarios" JSONB NOT NULL,
    "selectedScenarioId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeScenarioSelection_pkey" PRIMARY KEY ("mediaDeviceId")
);
