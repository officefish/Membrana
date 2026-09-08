/**
 * Pure rules for projecting docs/tariffs/tariff-grid.json into cabinet Tariff rows.
 * Kept in scripts/ because the CLI and Prisma seed run as plain Node.
 */
import { readFileSync } from 'node:fs';

const REPO_ROOT = new URL('../../', import.meta.url);
const GRID_URL = new URL('docs/tariffs/tariff-grid.json', REPO_ROOT);

const finding = (where, reason) => ({ toothId: 'tariff_base_projection', where, reason });

export function loadTariffGridDocument(url = GRID_URL) {
  return JSON.parse(readFileSync(url, 'utf8'));
}

function quota(row, id, unit) {
  const cell = row.cells?.[id];
  if (cell?.kind !== 'quota' || cell.unit !== unit || typeof cell.limit !== 'number') {
    throw new Error(`${row.sku}.${id}: expected quota/${unit}`);
  }
  return cell.limit;
}

function catalog(row, id) {
  const cell = row.cells?.[id];
  if (cell?.kind !== 'catalog' || !cell.catalogId) {
    throw new Error(`${row.sku}.${id}: expected catalog`);
  }
  return cell.catalogId;
}

export function tariffGridRowToCabinetBase(grid, row) {
  return {
    id: row.sku,
    name: row.productName,
    tariffContractVersion: grid.version,
    userStorageQuotaBytes: BigInt(quota(row, 'storage.hot', 'bytes')),
    bufferQuotaBytes: BigInt(quota(row, 'storage.buffer', 'bytes')),
    datasetCatalogId: catalog(row, 'dataset.sounds'),
    maxNodesPerMembrane: quota(row, 'nodes.max', 'count'),
    maxUserWorkspaces: quota(row, 'workspaces.user.max', 'count'),
  };
}

export function projectTariffGridToCabinetBase(grid) {
  return (grid.rows ?? []).map((row) => tariffGridRowToCabinetBase(grid, row));
}

export function tariffGridBaseFindings(grid, records) {
  const expectedById = new Map(projectTariffGridToCabinetBase(grid).map((row) => [row.id, row]));
  const actualById = new Map(records.map((row) => [row.id, row]));
  const out = [];
  for (const [id, expected] of expectedById) {
    const actual = actualById.get(id);
    if (!actual) {
      out.push(finding(id, 'тариф есть в сетке, но отсутствует в базе кабинета'));
      continue;
    }
    const pairs = [
      ['tariffContractVersion', 'version', actual.tariffContractVersion, expected.tariffContractVersion],
      ['userStorageQuotaBytes', 'storage.hot', BigInt(actual.userStorageQuotaBytes), expected.userStorageQuotaBytes],
      ['bufferQuotaBytes', 'storage.buffer', BigInt(actual.bufferQuotaBytes), expected.bufferQuotaBytes],
      ['datasetCatalogId', 'dataset.sounds', actual.datasetCatalogId, expected.datasetCatalogId],
      ['maxUserWorkspaces', 'workspaces.user.max', actual.maxUserWorkspaces, expected.maxUserWorkspaces],
    ];
    for (const [field, source, actualValue, expectedValue] of pairs) {
      if (actualValue !== expectedValue) {
        out.push(
          finding(`${id}.${field}`, `база несёт ${String(actualValue)}, сетка ${source} — ${String(expectedValue)}`),
        );
      }
    }
  }
  return out;
}

export async function upsertCabinetTariffs(prisma, rows) {
  for (const row of rows) {
    await prisma.tariff.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        tariffContractVersion: row.tariffContractVersion,
        userStorageQuotaBytes: row.userStorageQuotaBytes,
        bufferQuotaBytes: row.bufferQuotaBytes,
        datasetCatalogId: row.datasetCatalogId,
        maxNodesPerMembrane: row.maxNodesPerMembrane,
        maxUserWorkspaces: row.maxUserWorkspaces,
      },
    });
  }
  return { count: rows.length, ids: rows.map((row) => row.id), version: rows[0]?.tariffContractVersion ?? null };
}
