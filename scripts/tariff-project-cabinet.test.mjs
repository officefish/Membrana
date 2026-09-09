import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  loadTariffGridDocument,
  projectTariffGridToCabinetBase,
  tariffGridBaseFindings,
  upsertCabinetTariffs,
} from './lib/tariff-project-cabinet.mjs';

const GRID = loadTariffGridDocument();

test('projection writes all live grid tariffs, closing the #2297 one-row DB path', () => {
  const rows = projectTariffGridToCabinetBase(GRID);
  assert.deepEqual(rows.map((row) => row.id), ['free-v1', 'checkpoint-v1', 'observatory-v1']);
});

test('projection carries device-facing pairs plus contract version', () => {
  const free = projectTariffGridToCabinetBase(GRID)[0];
  const freeGrid = GRID.rows.find((row) => row.sku === 'free-v1');
  assert.equal(free.tariffContractVersion, GRID.version);
  assert.equal(free.userStorageQuotaBytes, BigInt(freeGrid.cells['storage.hot'].limit));
  assert.equal(free.bufferQuotaBytes, BigInt(freeGrid.cells['storage.buffer'].limit));
  assert.equal(free.datasetCatalogId, freeGrid.cells['dataset.sounds'].catalogId);
  assert.equal(free.maxNodesPerMembrane, freeGrid.cells['nodes.max'].limit);
  assert.equal(free.maxUserWorkspaces, freeGrid.cells['workspaces.user.max'].limit);
});

test('tooth 2 reddens when a DB row is missing', () => {
  const records = projectTariffGridToCabinetBase(GRID).filter((row) => row.id === 'free-v1');
  const findings = tariffGridBaseFindings(GRID, records);
  assert.deepEqual(findings.map((f) => f.where), ['checkpoint-v1', 'observatory-v1']);
});

test('tooth 2 reddens when a scalar drifts', () => {
  const records = projectTariffGridToCabinetBase(GRID).map((row) =>
    row.id === 'free-v1' ? { ...row, bufferQuotaBytes: 42n } : row,
  );
  const findings = tariffGridBaseFindings(GRID, records);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].where, 'free-v1.bufferQuotaBytes');
  assert.match(findings[0].reason, /storage\.buffer/u);
});

test('tooth 2 reddens when node quota drifts', () => {
  const records = projectTariffGridToCabinetBase(GRID).map((row) =>
    row.id === 'free-v1' ? { ...row, maxNodesPerMembrane: row.maxNodesPerMembrane + 1 } : row,
  );
  const findings = tariffGridBaseFindings(GRID, records);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].where, 'free-v1.maxNodesPerMembrane');
  assert.match(findings[0].reason, /nodes\.max/u);
});

test('upsert uses the projection as create/update data and never calls tariff-scalars', async () => {
  const calls = [];
  const prisma = {
    tariff: {
      upsert: async (args) => {
        calls.push(args);
      },
    },
  };
  const rows = projectTariffGridToCabinetBase(GRID);
  const result = await upsertCabinetTariffs(prisma, rows);
  assert.equal(result.count, 3);
  assert.deepEqual(calls.map((c) => c.where.id), ['free-v1', 'checkpoint-v1', 'observatory-v1']);
  assert.equal(calls[0].create.userStorageQuotaBytes, 536870912n);
  assert.equal(calls[0].update.userStorageQuotaBytes, 536870912n);
});
