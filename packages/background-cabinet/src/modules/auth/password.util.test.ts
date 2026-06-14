import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, createSessionToken, sessionExpiresAt } from './password.util';

describe('password.util', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('secret-password');
    expect(hash).not.toBe('secret-password');
    expect(await verifyPassword('secret-password', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('creates session token and expiry', () => {
    const token = createSessionToken();
    expect(token.length).toBeGreaterThan(20);
    const expires = sessionExpiresAt(24);
    expect(expires.getTime()).toBeGreaterThan(Date.now());
  });
});
