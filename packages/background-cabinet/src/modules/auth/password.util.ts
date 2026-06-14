import { randomBytes } from 'node:crypto';
import { hash, compare } from 'bcryptjs';

/** Production: 12. Vitest/CI: 4 — иначе hash+verify не укладываются в testTimeout на shared runner. */
const BCRYPT_ROUNDS =
  process.env.VITEST === 'true' || process.env.NODE_ENV === 'test' ? 4 : 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sessionExpiresAt(ttlHours: number): Date {
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
}
