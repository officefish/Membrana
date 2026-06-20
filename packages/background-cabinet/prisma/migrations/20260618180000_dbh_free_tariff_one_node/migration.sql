-- DBH3: free-v1 tariff allows one node per membrane (product default).
UPDATE "Tariff" SET "maxNodesPerMembrane" = 1 WHERE "id" = 'free-v1';
