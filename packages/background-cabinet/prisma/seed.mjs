import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

import { declarationFindings, loadDeclaration, mibToBytes, tariffScalars } from './tariff-scalars.mjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const FREE_TARIFF_ID = 'free-v1';

/**
 * S0 плана интеграции сетки: числа берутся ТОЛЬКО из декларации
 * `docs/tariffs/tariff-scalars.json`. Раньше они жили константами здесь — и сид
 * нёс 1 ГБ, когда владелец давно назвал 512 МБ (расхождение декларации и
 * носителя, вещдок 29.07). Второй источник чисел не заводить.
 *
 * `update` обновляет потолки наравне с `create`: прежде повторный сид оставлял
 * старому ряду прежний объём, и решение владельца до существующей базы не доезжало.
 */
async function seedTariff() {
  const declaration = loadDeclaration();
  const findings = declarationFindings(declaration);
  for (const f of findings) console.warn(`[tariff-scalars] находка декларации: ${f}`);

  const free = tariffScalars(FREE_TARIFF_ID, declaration);
  const quotas = {
    userStorageQuotaBytes: mibToBytes(free.userStorageQuotaMiB),
    bufferQuotaBytes: mibToBytes(free.bufferQuotaMiB),
    datasetCatalogId: free.datasetCatalogId,
    maxActiveKeysPerNode: free.maxActiveKeysPerNode,
    maxNodesPerMembrane: free.maxNodesPerMembrane,
    maxUserWorkspaces: free.maxUserWorkspaces,
  };
  for (const [field, value] of Object.entries(quotas)) {
    if (value == null) {
      throw new Error(
        `Seed: ${FREE_TARIFF_ID}.${field} не объявлен в декларации — сид не выдумывает числа (S0)`,
      );
    }
  }

  await prisma.tariff.upsert({
    where: { id: FREE_TARIFF_ID },
    create: { id: FREE_TARIFF_ID, name: `${free.productName} (${FREE_TARIFF_ID})`, ...quotas },
    update: quotas,
  });
  console.log(
    `Seed ok: tariff "${FREE_TARIFF_ID}" (${free.productName}) — ` +
      `хранение ${free.userStorageQuotaMiB} МиБ, устройств ${free.maxNodesPerMembrane}, ` +
      `пользовательских сценариев ${free.maxUserWorkspaces}`,
  );
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
