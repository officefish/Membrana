/**
 * #279: иерархия статус-бейджа карточки узла. Истёкший/отозванный ключ
 * приоритетнее транспортного online/offline — оператору нужно действовать
 * (перевыпустить ключ и пересопрячь), а не ждать связи. Истечение ключа —
 * штатный контур безопасности, поэтому «устарел» = warning, «отозван» = error.
 */
export type NodeCardStatus =
  | 'not-paired'
  | 'key-revoked'
  | 'key-expired'
  | 'online'
  | 'offline';

export function resolveNodeCardStatus(input: {
  readonly paired: boolean;
  readonly pairedKeyStatus: 'active' | 'expired' | 'revoked' | null;
  readonly deviceLive: boolean;
}): NodeCardStatus {
  if (!input.paired) return 'not-paired';
  if (input.pairedKeyStatus === 'revoked') return 'key-revoked';
  if (input.pairedKeyStatus === 'expired') return 'key-expired';
  return input.deviceLive ? 'online' : 'offline';
}
