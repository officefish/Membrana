/**
 * cabinet-key-expired-status (#279): производный статус ключа сопряжённого
 * устройства — НА ЧТЕНИИ, без миграций (enum DevicePairingStatus не трогаем,
 * pairedKeyId хранится для истории — PL2). Истечение ключа — штатный контур
 * безопасности; кабинет должен показывать «ключ устарел», а не «offline».
 * Источник истины по времени — сервер (часы клиента не участвуют).
 */

export type PairedKeyStatus = 'active' | 'expired' | 'revoked';

export interface PairedKeyStatusView {
  readonly status: PairedKeyStatus;
  /** ISO; null, если ключ удалён и срок неизвестен. */
  readonly expiresAt: string | null;
}

export function resolvePairedKeyStatus(
  input: {
    readonly pairingStatus: 'paired' | 'revoked' | 'unpaired';
    /** Ключ, которым сопрягалось устройство (по pairedKeyId); null — удалён. */
    readonly pairedKey: { readonly expiresAt: Date; readonly revokedAt: Date | null } | null;
  },
  now: Date = new Date(),
): PairedKeyStatusView {
  if (input.pairingStatus === 'revoked') {
    return { status: 'revoked', expiresAt: input.pairedKey?.expiresAt.toISOString() ?? null };
  }
  // PL3: «Удалить» = revoke + delete — исчезнувший ключ трактуем как отозванный.
  if (input.pairedKey === null) {
    return { status: 'revoked', expiresAt: null };
  }
  if (input.pairedKey.revokedAt !== null) {
    return { status: 'revoked', expiresAt: input.pairedKey.expiresAt.toISOString() };
  }
  if (input.pairedKey.expiresAt.getTime() <= now.getTime()) {
    return { status: 'expired', expiresAt: input.pairedKey.expiresAt.toISOString() };
  }
  return { status: 'active', expiresAt: input.pairedKey.expiresAt.toISOString() };
}
