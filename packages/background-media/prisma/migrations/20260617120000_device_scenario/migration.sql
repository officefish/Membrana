-- Device-scenario JSON per paired device (DB-H2d cabinet sync).

CREATE TABLE "DeviceScenario" (
    "deviceId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceScenario_pkey" PRIMARY KEY ("deviceId")
);

ALTER TABLE "DeviceScenario" ADD CONSTRAINT "DeviceScenario_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
