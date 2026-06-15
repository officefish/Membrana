-- MP3: paired Device linked to Node + media deviceId
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "mediaDeviceId" UUID NOT NULL,
    "label" TEXT,
    "pairedKeyId" UUID,
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Device_nodeId_key" ON "Device"("nodeId");
CREATE UNIQUE INDEX "Device_mediaDeviceId_key" ON "Device"("mediaDeviceId");
CREATE INDEX "Device_mediaDeviceId_idx" ON "Device"("mediaDeviceId");

ALTER TABLE "Device" ADD CONSTRAINT "Device_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
