/**
 * Projection of the tariff grid into the cabinet Tariff table (#2333 v2).
 *
 * The grid is the author. The database row is a carrier for FK checks, cabinet
 * page reads and fanout to media devices.
 */
import type { EntitlementValue, TariffGridDocument, TariffGridRow } from './tariff-grid';

export interface CabinetTariffBase {
  readonly id: string;
  readonly name: string;
  readonly tariffContractVersion: number;
  readonly userStorageQuotaBytes: bigint;
  readonly bufferQuotaBytes: bigint;
  readonly datasetCatalogId: string;
  readonly maxNodesPerMembrane: number;
  readonly maxUserWorkspaces: number;
}

export interface CabinetTariffRecord {
  readonly id: string;
  readonly name?: string;
  readonly tariffContractVersion: number;
  readonly userStorageQuotaBytes: bigint;
  readonly bufferQuotaBytes: bigint;
  readonly datasetCatalogId: string;
  readonly maxNodesPerMembrane: number;
  readonly maxUserWorkspaces: number;
}

export interface TariffGridBaseFinding {
  readonly toothId: 'tariff_base_projection';
  readonly where: string;
  readonly reason: string;
}

const finding = (where: string, reason: string): TariffGridBaseFinding => ({
  toothId: 'tariff_base_projection',
  where,
  reason,
});

function requireQuota(row: TariffGridRow, id: string, unit: 'bytes' | 'count'): number {
  const cell: EntitlementValue | undefined = row.cells[id];
  if (cell?.kind !== 'quota' || cell.unit !== unit || !Number.isFinite(cell.limit)) {
    throw new Error(`${row.sku}.${id}: quota/${unit} cell expected`);
  }
  return cell.limit;
}

function requireCatalog(row: TariffGridRow, id: string): string {
  const cell: EntitlementValue | undefined = row.cells[id];
  if (cell?.kind !== 'catalog' || !cell.catalogId) {
    throw new Error(`${row.sku}.${id}: catalog cell expected`);
  }
  return cell.catalogId;
}

export function tariffGridRowToCabinetBase(grid: TariffGridDocument, row: TariffGridRow): CabinetTariffBase {
  return {
    id: row.sku,
    name: row.productName,
    tariffContractVersion: grid.version,
    userStorageQuotaBytes: BigInt(requireQuota(row, 'storage.hot', 'bytes')),
    bufferQuotaBytes: BigInt(requireQuota(row, 'storage.buffer', 'bytes')),
    datasetCatalogId: requireCatalog(row, 'dataset.sounds'),
    maxNodesPerMembrane: requireQuota(row, 'nodes.max', 'count'),
    maxUserWorkspaces: requireQuota(row, 'workspaces.user.max', 'count'),
  };
}

export function projectTariffGridToCabinetBase(grid: TariffGridDocument): readonly CabinetTariffBase[] {
  return grid.rows.map((row) => tariffGridRowToCabinetBase(grid, row));
}

export function tariffGridBaseFindings(
  grid: TariffGridDocument,
  records: readonly CabinetTariffRecord[],
): readonly TariffGridBaseFinding[] {
  const expectedById = new Map(projectTariffGridToCabinetBase(grid).map((row) => [row.id, row]));
  const actualById = new Map(records.map((row) => [row.id, row]));
  const out: TariffGridBaseFinding[] = [];

  for (const [id, expected] of expectedById) {
    const actual = actualById.get(id);
    if (!actual) {
      out.push(finding(id, 'тариф есть в сетке, но отсутствует в базе кабинета'));
      continue;
    }
    const pairs: Array<[keyof CabinetTariffBase, string, unknown, unknown]> = [
      ['tariffContractVersion', 'version', actual.tariffContractVersion, expected.tariffContractVersion],
      ['userStorageQuotaBytes', 'storage.hot', actual.userStorageQuotaBytes, expected.userStorageQuotaBytes],
      ['bufferQuotaBytes', 'storage.buffer', actual.bufferQuotaBytes, expected.bufferQuotaBytes],
      ['datasetCatalogId', 'dataset.sounds', actual.datasetCatalogId, expected.datasetCatalogId],
      ['maxUserWorkspaces', 'workspaces.user.max', actual.maxUserWorkspaces, expected.maxUserWorkspaces],
    ];
    for (const [field, source, actualValue, expectedValue] of pairs) {
      if (actualValue !== expectedValue) {
        out.push(
          finding(
            `${id}.${String(field)}`,
            `база несёт ${String(actualValue)}, сетка ${source} — ${String(expectedValue)}`,
          ),
        );
      }
    }
  }

  return out;
}
