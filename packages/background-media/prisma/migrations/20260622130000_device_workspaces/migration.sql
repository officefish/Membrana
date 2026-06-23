-- AlterTable
ALTER TABLE "Device" ADD COLUMN "activeWorkspaceId" TEXT;

-- CreateTable
CREATE TABLE "DeviceWorkspace" (
    "deviceId" UUID NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceWorkspace_pkey" PRIMARY KEY ("deviceId","workspaceId")
);

-- CreateIndex
CREATE INDEX "DeviceWorkspace_deviceId_idx" ON "DeviceWorkspace"("deviceId");

-- AddForeignKey
ALTER TABLE "DeviceWorkspace" ADD CONSTRAINT "DeviceWorkspace_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
