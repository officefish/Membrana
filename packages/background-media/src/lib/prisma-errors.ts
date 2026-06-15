import { Prisma } from '../prisma/client';

/** True when a create/update hit a unique constraint (e.g. concurrent catalog provision). */
export function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}
