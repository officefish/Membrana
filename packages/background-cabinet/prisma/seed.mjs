import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  const login = (process.env.CABINET_BOOTSTRAP_LOGIN || 'demo').trim().toLowerCase();
  const password = process.env.CABINET_BOOTSTRAP_PASSWORD || 'demo12345';

  if (login.length < 3 || password.length < 8) {
    throw new Error('CABINET_BOOTSTRAP_LOGIN min 3, CABINET_BOOTSTRAP_PASSWORD min 8');
  }

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    console.log(`Seed skip: user "${login}" already exists`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.create({ data: { login, passwordHash } });
  console.log(`Seed ok: user "${login}" created`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
