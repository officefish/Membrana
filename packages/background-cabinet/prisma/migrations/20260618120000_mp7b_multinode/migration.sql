-- MP7b RT4: multi-node per membrane.
-- Drop the one-node-per-membrane unique constraint, replace with a plain index,
-- and add a per-tariff node limit (default 1; free tariff bumped to 2 via seed).

DROP INDEX "Node_membraneId_key";

CREATE INDEX "Node_membraneId_idx" ON "Node"("membraneId");

ALTER TABLE "Tariff" ADD COLUMN "maxNodesPerMembrane" INTEGER NOT NULL DEFAULT 1;

UPDATE "Tariff" SET "maxNodesPerMembrane" = 2 WHERE "id" = 'free-v1';
