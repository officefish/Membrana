import { NODE_RECENT_PRESENCE_WINDOW_MS, type RuntimeOverflowHoldPayload } from '@membrana/core';

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

/**
 * ОДИН порог «умер» (M4 (в), #2309): молчание heartbeat/link-state узла дольше существующего
 * presence-окна кабинета — 300 с (`NODE_RECENT_PRESENCE_WINDOW_MS`). Из трёх порогов ствола
 * выбран именно он: echo-ping 3 с — проба кабинет→узел, не признак жизни; heartbeat 120 с —
 * один пропуск ещё не смерть. Нового порога «от телеметрии» нет и не будет: молчание
 * `telemetry-track/v1` — не остановка жизни узла.
 */
export const NODE_DEAD_SILENCE_MS = NODE_RECENT_PRESENCE_WINDOW_MS;

/**
 * `dead` — линк потерян; `stopped_buffer_full` — линк жив ∧ удержание ∧ `overflowId` есть
 * (штатный стоп, «жив · не пишет · причина»); `alive` — остальное, в том числе удержание без
 * серверного id (локальный страж): строка о нём показывается, но предикат стопа ждёт id.
 */
export type NodeVitality = 'dead' | 'stopped_buffer_full' | 'alive';

export interface NodeVitalityInput {
  /** Узел в online-presence кабинета (node.online / presence.snapshot). */
  readonly presenceOnline: boolean;
  /** Последний heartbeat/link-state узла, мс; null — кабинет времени не знает, судит по presence. */
  readonly lastPresenceAtMs: number | null;
  readonly nowMs: number;
  readonly overflowHold: RuntimeOverflowHoldPayload | null | undefined;
}

export function isNodeDead(input: Pick<NodeVitalityInput, 'presenceOnline' | 'lastPresenceAtMs' | 'nowMs'>): boolean {
  if (!input.presenceOnline) return true;
  if (input.lastPresenceAtMs === null) return false;
  return input.nowMs - input.lastPresenceAtMs > NODE_DEAD_SILENCE_MS;
}

export function isNodeStoppedBufferFull(input: NodeVitalityInput): boolean {
  if (isNodeDead(input)) return false;
  const hold = input.overflowHold;
  return hold != null && hold.overflowId !== null && hold.overflowId.length > 0;
}

export function resolveNodeVitality(input: NodeVitalityInput): NodeVitality {
  if (isNodeDead(input)) return 'dead';
  if (isNodeStoppedBufferFull(input)) return 'stopped_buffer_full';
  return 'alive';
}
