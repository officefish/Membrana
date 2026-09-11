import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { TariffGridDocument } from './tariff-grid';
import {
  projectTariffGridToCabinetBase,
  tariffGridBaseFindings,
  tariffGridRowToCabinetBase,
} from './tariff-grid-base';

const LIVE: TariffGridDocument = JSON.parse(
  readFileSync(new URL('../../../../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'),
);

describe('grid -> cabinet Tariff projection (#2333 v2)', () => {
  it('projects every live grid tariff into a cabinet DB carrier', () => {
    const rows = projectTariffGridToCabinetBase(LIVE);
    expect(rows.map((row) => row.id)).toEqual(['free-v1', 'checkpoint-v1', 'observatory-v1']);
    expect(rows.map((row) => row.tariffContractVersion)).toEqual([1, 1, 1]);
  });

  it('free-v1 storage comes from the grid, not old seed constants', () => {
    const free = tariffGridRowToCabinetBase(LIVE, LIVE.rows[0]!);
    const freeGrid = LIVE.rows[0]!;
    expect(free.userStorageQuotaBytes).toBe(BigInt(freeGrid.cells['storage.hot']!.limit));
    expect(free.bufferQuotaBytes).toBe(BigInt(freeGrid.cells['storage.buffer']!.limit));
    expect(free.datasetCatalogId).toBe(freeGrid.cells['dataset.sounds']!.catalogId);
    expect(free.maxNodesPerMembrane).toBe(freeGrid.cells['nodes.max']!.limit);
    expect(free.maxUserWorkspaces).toBe(freeGrid.cells['workspaces.user.max']!.limit);
  });

  it('tooth 2 is green when DB carrier equals grid projection by fields plus version', () => {
    const records = projectTariffGridToCabinetBase(LIVE);
    expect(tariffGridBaseFindings(LIVE, records)).toEqual([]);
  });

  it('tooth 2 reddens on the #2297 missing tariff path', () => {
    const records = projectTariffGridToCabinetBase(LIVE).filter((row) => row.id === 'free-v1');
    const findings = tariffGridBaseFindings(LIVE, records);
    expect(findings.map((f) => f.where)).toEqual(['checkpoint-v1', 'observatory-v1']);
  });

  it('tooth 2 reddens when a scalar drifts from the grid projection', () => {
    const records = projectTariffGridToCabinetBase(LIVE).map((row) =>
      row.id === 'free-v1' ? { ...row, userStorageQuotaBytes: 1073741824n } : row,
    );
    const findings = tariffGridBaseFindings(LIVE, records);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      toothId: 'tariff_base_projection',
      where: 'free-v1.userStorageQuotaBytes',
    });
    expect(findings[0]!.reason).toMatch(/storage\.hot/u);
  });

  it('tooth 2 reddens when node quota drifts from the grid projection', () => {
    const records = projectTariffGridToCabinetBase(LIVE).map((row) =>
      row.id === 'free-v1' ? { ...row, maxNodesPerMembrane: row.maxNodesPerMembrane + 1 } : row,
    );
    const findings = tariffGridBaseFindings(LIVE, records);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      toothId: 'tariff_base_projection',
      where: 'free-v1.maxNodesPerMembrane',
    });
    expect(findings[0]!.reason).toMatch(/nodes\.max/u);
  });

  it('tooth 2 reddens when the contract version is stale', () => {
    const records = projectTariffGridToCabinetBase(LIVE).map((row) =>
      row.id === 'checkpoint-v1' ? { ...row, tariffContractVersion: 0 } : row,
    );
    expect(tariffGridBaseFindings(LIVE, records).map((f) => f.where)).toContain(
      'checkpoint-v1.tariffContractVersion',
    );
  });
});
