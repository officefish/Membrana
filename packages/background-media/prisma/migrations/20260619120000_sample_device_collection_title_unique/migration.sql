-- Remove duplicate catalog rows (race during parallel provision), keep oldest per (device, collection, title).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "deviceId", "collectionId", title
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "Sample"
)
DELETE FROM "Sample" s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX "Sample_deviceId_collectionId_title_key"
  ON "Sample" ("deviceId", "collectionId", title);
