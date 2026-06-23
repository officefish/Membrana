import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const FREE_TARIFF_ID = 'free-v1';
const FREE_DATASET_CATALOG_ID = 'free-v1-catalog';
const GIB = 1024n * 1024n * 1024n;

async function seedTariff() {
  await prisma.tariff.upsert({
    where: { id: FREE_TARIFF_ID },
    create: {
      id: FREE_TARIFF_ID,
      name: 'Free v1',
      userStorageQuotaBytes: GIB,
      bufferQuotaBytes: GIB,
      datasetCatalogId: FREE_DATASET_CATALOG_ID,
      maxActiveKeysPerNode: 1,
      maxNodesPerMembrane: 1,
      maxUserWorkspaces: 3,
    },
    update: {
      datasetCatalogId: FREE_DATASET_CATALOG_ID,
      maxNodesPerMembrane: 1,
      maxUserWorkspaces: 3,
    },
  });
  console.log(`Seed ok: tariff "${FREE_TARIFF_ID}"`);
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
