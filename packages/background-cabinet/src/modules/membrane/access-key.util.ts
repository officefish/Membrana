import { randomBytes } from 'node:crypto';
import { hash, compare } from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export function createAccessKeySecret(): string {
  return randomBytes(24).toString('base64url');
}

export function hashAccessKeySecret(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export function verifyAccessKeySecret(plain: string, secretHash: string): Promise<boolean> {
  return compare(plain, secretHash);
}
