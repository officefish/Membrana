-- Collection ids are per-device (e.g. __tariff_dataset__ on each deviceId).
ALTER TABLE "Sample" DROP CONSTRAINT IF EXISTS "Sample_collectionId_fkey";
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_pkey";
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_pkey" PRIMARY KEY ("deviceId", "id");
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_deviceId_collectionId_fkey" FOREIGN KEY ("deviceId", "collectionId") REFERENCES "Collection"("deviceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
