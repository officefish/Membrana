import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

import {
  loadTariffGridDocument,
  projectTariffGridToCabinetBase,
  upsertCabinetTariffs,
} from '../../../scripts/lib/tariff-project-cabinet.mjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

/**
 * #2333 v2: seed is not an author of quota numbers. It delegates all Tariff
 * rows to the accepted grid projection, so repeated seed closes #2297 instead
 * of silently restoring an old free-v1 scalar.
 */
async function seedTariff() {
  const grid = loadTariffGridDocument();
  const rows = projectTariffGridToCabinetBase(grid);
  const result = await upsertCabinetTariffs(prisma, rows);
  console.log(`Seed ok: tariff grid projected — ${result.count} rows, version ${result.version}`);
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
  await seedTariff();
  await seedBootstrapUser();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
