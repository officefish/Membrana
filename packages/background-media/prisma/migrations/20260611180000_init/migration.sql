-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('microphone', 'antenna', 'other');

-- CreateEnum
CREATE TYPE "CollectionKind" AS ENUM ('buffer', 'user', 'system');

-- CreateEnum
CREATE TYPE "SampleLabel" AS ENUM ('drone', 'not_drone', 'unlabeled');

-- CreateEnum
CREATE TYPE "SampleSource" AS ENUM ('mic_recording', 'disk_import', 'synthetic', 'move');

-- CreateEnum
CREATE TYPE "AudioFormat" AS ENUM ('wav', 'mp3', 'flac', 'ogg');

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DeviceKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "deviceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CollectionKind" NOT NULL,
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "collectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "label" "SampleLabel" NOT NULL,
    "source" "SampleSource" NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "sampleRate" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL,
    "audioFormat" "AudioFormat" NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageRef" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendTemplate" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collection_deviceId_idx" ON "Collection"("deviceId");

-- CreateIndex
CREATE INDEX "Sample_deviceId_idx" ON "Sample"("deviceId");

-- CreateIndex
CREATE INDEX "Sample_deviceId_collectionId_idx" ON "Sample"("deviceId", "collectionId");

-- CreateIndex
CREATE INDEX "TrendTemplate_deviceId_idx" ON "TrendTemplate"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "TrendTemplate_deviceId_key_key" ON "TrendTemplate"("deviceId", "key");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendTemplate" ADD CONSTRAINT "TrendTemplate_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
