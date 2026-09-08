#!/usr/bin/env node
/**
 * Tooth 3: cabinet tariff context must match every media Device row by fields.
 */
import { PrismaClient as CabinetPrisma } from '../packages/background-cabinet/generated/prisma/index.js';
import { PrismaClient as MediaPrisma } from '../packages/background-media/generated/prisma/index.js';
import { expectedDevicesFromCabinetRows, tariffDeviceFindings } from './lib/tariff-devices-check.mjs';

const cabinet = new CabinetPrisma({ datasourceUrl: process.env.CABINET_DATABASE_URL ?? process.env.DATABASE_URL });
const media = new MediaPrisma({ datasourceUrl: process.env.MEDIA_DATABASE_URL ?? process.env.DATABASE_URL });

async function main() {
  const cabinetDevices = await cabinet.device.findMany({
    where: { mediaDeviceId: { not: '' } },
    select: {
      mediaDeviceId: true,
      node: {
        select: {
          membrane: {
            select: {
              tariff: {
                select: {
                  tariffContractVersion: true,
                  userStorageQuotaBytes: true,
                  bufferQuotaBytes: true,
                  datasetCatalogId: true,
                  maxUserWorkspaces: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const expected = expectedDevicesFromCabinetRows(cabinetDevices);
  const mediaDevices = expected.length === 0
    ? []
    : await media.device.findMany({
        where: { id: { in: expected.map((device) => device.mediaDeviceId) } },
        select: {
          id: true,
          tariffContractVersion: true,
          userStorageQuotaBytes: true,
          bufferQuotaBytes: true,
          datasetCatalogId: true,
          maxUserWorkspaces: true,
          bufferPolicy: true,
        },
      });

  const findings = tariffDeviceFindings(expected, mediaDevices);
  console.log(`tariff:devices-check — проверено приборов ${expected.length}`);
  if (findings.length === 0) {
    console.log('tariff:devices-check — cabinet tariff ↔ media Device совпадают по пяти парам + policy');
    return 0;
  }
  console.error(`tariff:devices-check — находок: ${findings.length}`);
  for (const f of findings) console.error(`  ✖ [${f.toothId}] ${f.where} — ${f.reason}`);
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`tariff:devices-check — ошибка: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  })
  .finally(() => void Promise.all([cabinet.$disconnect(), media.$disconnect()]));
