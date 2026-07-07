import { describe, expect, it } from 'vitest';

import { resolvePairedKeyStatus } from './paired-key-status';

const now = new Date('2026-07-07T12:00:00.000Z');
const future = new Date('2026-08-01T00:00:00.000Z');
const past = new Date('2026-07-01T00:00:00.000Z');

describe('resolvePairedKeyStatus (#279)', () => {
  it('живой ключ → active со сроком', () => {
    expect(
      resolvePairedKeyStatus(
        { pairingStatus: 'paired', pairedKey: { expiresAt: future, revokedAt: null } },
        now,
      ),
    ).toEqual({ status: 'active', expiresAt: future.toISOString() });
  });

  it('истёкший ключ → expired (штатный контур безопасности)', () => {
    expect(
      resolvePairedKeyStatus(
        { pairingStatus: 'paired', pairedKey: { expiresAt: past, revokedAt: null } },
        now,
      ),
    ).toEqual({ status: 'expired', expiresAt: past.toISOString() });
  });

  it('граница: expiresAt == now считается истёкшим', () => {
    expect(
      resolvePairedKeyStatus(
        { pairingStatus: 'paired', pairedKey: { expiresAt: now, revokedAt: null } },
        now,
      ).status,
    ).toBe('expired');
  });

  it('отозванный ключ → revoked, даже если срок в будущем', () => {
    expect(
      resolvePairedKeyStatus(
        { pairingStatus: 'paired', pairedKey: { expiresAt: future, revokedAt: past } },
        now,
      ).status,
    ).toBe('revoked');
  });

  it('pairingStatus=revoked приоритетнее содержимого ключа', () => {
    expect(
      resolvePairedKeyStatus(
        { pairingStatus: 'revoked', pairedKey: { expiresAt: future, revokedAt: null } },
        now,
      ).status,
    ).toBe('revoked');
  });

  it('ключ удалён (PL3 revoke+delete) → revoked без срока', () => {
    expect(
      resolvePairedKeyStatus({ pairingStatus: 'paired', pairedKey: null }, now),
    ).toEqual({ status: 'revoked', expiresAt: null });
  });
});
