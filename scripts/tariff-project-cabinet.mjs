#!/usr/bin/env node
/**
 * Project the accepted tariff grid into the cabinet Tariff table (#2333 v2).
 *
 * Default mode writes idempotently. --check only compares DB rows with the grid.
 */
import { PrismaClient } from '../packages/background-cabinet/generated/prisma/index.js';
import {
  loadTariffGridDocument,
  projectTariffGridToCabinetBase,
  tariffGridBaseFindings,
  upsertCabinetTariffs,
} from './lib/tariff-project-cabinet.mjs';

const prisma = new PrismaClient();

async function main(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes('--check');
  const grid = loadTariffGridDocument();
  const rows = projectTariffGridToCabinetBase(grid);

  if (checkOnly) {
    const records = await prisma.tariff.findMany({
      select: {
        id: true,
        tariffContractVersion: true,
        userStorageQuotaBytes: true,
        bufferQuotaBytes: true,
        datasetCatalogId: true,
        maxNodesPerMembrane: true,
        maxUserWorkspaces: true,
      },
    });
    const findings = tariffGridBaseFindings(grid, records);
    console.log(`tariff:project-cabinet --check — сетка version ${grid.version} · тарифов ${rows.length}`);
    if (findings.length === 0) {
      console.log('tariff:project-cabinet — база кабинета совпадает с сеткой по полям тарифа + version');
      return 0;
    }
    console.error(`tariff:project-cabinet — находок: ${findings.length}`);
    for (const f of findings) console.error(`  ✖ [${f.toothId}] ${f.where} — ${f.reason}`);
    return 1;
  }

  const result = await upsertCabinetTariffs(prisma, rows);
  console.log(
    `tariff:project-cabinet — записано тарифов ${result.count} · version ${result.version} · ${result.ids.join(', ')}`,
  );
  return 0;
}

if (process.argv[1]?.endsWith('tariff-project-cabinet.mjs')) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(`tariff:project-cabinet — ошибка: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 2;
    })
    .finally(() => void prisma.$disconnect());
}
