import { Prisma } from '../prisma/client';
import { describe, expect, it } from 'vitest';

import { isPrismaUniqueViolation } from './prisma-errors';

describe('isPrismaUniqueViolation', () => {
  it('returns true for P2002', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    expect(isPrismaUniqueViolation(err)).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isPrismaUniqueViolation(new Error('nope'))).toBe(false);
  });
});
