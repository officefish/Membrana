import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { declarationFindings, loadDeclaration, tariffScalars } from './tariff-scalars.mjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const TARIFF_GRID_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/tariffs/tariff-grid.json',
);

function loadTariffGrid(path = TARIFF_GRID_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function requiredCell(row, entitlementId, kind) {
  const cell = row.cells?.[entitlementId];
  if (cell?.kind !== kind) {
    throw new Error(
      `Seed: ${row.sku}.${entitlementId} должен быть ячейкой рода ${kind} — сид читает grid, а не выдумывает поле`,
    );
  }
  return cell;
}

function requiredInteger(row, entitlementId) {
  const cell = requiredCell(row, entitlementId, 'quota');
  if (!Number.isSafeInteger(cell.limit) || cell.limit < 0) {
    throw new Error(`Seed: ${row.sku}.${entitlementId}.limit должен быть безопасным целым числом`);
  }
  return cell.limit;
}

function requiredCatalogId(row, entitlementId) {
  const cell = requiredCell(row, entitlementId, 'catalog');
  if (typeof cell.catalogId !== 'string' || cell.catalogId.trim() === '') {
    throw new Error(`Seed: ${row.sku}.${entitlementId}.catalogId должен быть непустой строкой`);
  }
  return cell.catalogId;
}

function tariffRecordFromGridRow(row, declaration) {
  const declared = tariffScalars(row.sku, declaration);
  if (declared.productName !== row.productName) {
    throw new Error(
      `Seed: ${row.sku}.productName расходится между tariff-scalars.json и tariff-grid.json`,
    );
  }

  const record = {
    name: `${row.productName} (${row.sku})`,
    userStorageQuotaBytes: BigInt(requiredInteger(row, 'storage.hot')),
    bufferQuotaBytes: BigInt(requiredInteger(row, 'storage.buffer')),
    datasetCatalogId: requiredCatalogId(row, 'dataset.sounds'),
    maxNodesPerMembrane: requiredInteger(row, 'nodes.max'),
    maxUserWorkspaces: requiredInteger(row, 'workspaces.user.max'),
  };

  if (declared.maxActiveKeysPerNode != null) {
    record.maxActiveKeysPerNode = declared.maxActiveKeysPerNode;
  }

  return record;
}

/**
 * S1 плана интеграции сетки: строки справочника Tariff открываются по
 * `docs/tariffs/tariff-grid.json`. Это та же проекция, которую читает витрина и
 * домен перехода; сид не держит собственного списка SKU и числовых констант.
 *
 * S0 (`tariff-scalars.json`) остаётся проверкой декларации и источником полей,
 * которые ещё не живут в matrix cells. Если productName расходится, сид падает:
 * два носителя одного имени молча разойтись не могут.
 *
 * По умолчанию сид ОТКРЫВАЕТ НЕДОСТАЮЩИЕ строки и не перетирает существующие.
 * Рестамп старого ряда — отдельное решение владельца, включается только через
 * `CABINET_TARIFF_RESTAMP=true`.
 */
async function seedTariffs() {
  const declaration = loadDeclaration();
  const findings = declarationFindings(declaration);
  for (const f of findings) console.warn(`[tariff-scalars] находка декларации: ${f}`);

  const grid = loadTariffGrid();
  if (!Array.isArray(grid.rows) || grid.rows.length === 0) {
    throw new Error('Seed: tariff-grid.json не несёт rows — открывать нечего');
  }

  const restamp = process.env.CABINET_TARIFF_RESTAMP === 'true';
  for (const row of grid.rows) {
    const record = tariffRecordFromGridRow(row, declaration);
    const existing = await prisma.tariff.findUnique({ where: { id: row.sku }, select: { id: true } });
    if (existing && !restamp) {
      console.log(`Seed skip: tariff "${row.sku}" already exists (no restamp)`);
      continue;
    }
    await prisma.tariff.upsert({
      where: { id: row.sku },
      create: { id: row.sku, ...record },
      update: record,
    });
    console.log(
      `Seed ok: tariff "${row.sku}" (${row.productName}) ${existing ? 'restamped' : 'created'} — ` +
        `хранение ${record.userStorageQuotaBytes.toString()} байт, буфер ${record.bufferQuotaBytes.toString()} байт, ` +
        `устройств ${record.maxNodesPerMembrane}, пользовательских сценариев ${record.maxUserWorkspaces}`,
    );
  }
}

async function seedBootstrapUser() {
  const login = (process.env.CABINET_BOOTSTRAP_LOGIN || 'admin').trim().toLowerCase();
  const password = process.env.CABINET_BOOTSTRAP_PASSWORD || 'demo12345';

  if (login.length < 3 || password.length < 8) {
    throw new Error('CABINET_BOOTSTRAP_LOGIN min 3, CABINET_BOOTSTRAP_PASSWORD min 8');
  }

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
      console.log(`Seed ok: promoted user "${login}" to admin`);
    } else {
      console.log(`Seed skip: user "${login}" already exists`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.create({ data: { login, passwordHash, role: 'admin' } });
  console.log(`Seed ok: admin user "${login}" created`);
}

async function main() {
  await seedTariffs();
  await seedBootstrapUser();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
