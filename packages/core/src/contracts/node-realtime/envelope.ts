/** Версия wire-протокола MP7 (Node Realtime Gateway). */
export const NODE_REALTIME_PROTOCOL_V = 1 as const;

export type NodeRealtimeProtocolVersion = typeof NODE_REALTIME_PROTOCOL_V;

/** Каналы MP7. `runtime` — MP7b; `board` — server-first edit lease / capture (SF1). */
export type NodeRealtimeChannel = 'journal' | 'mic-live' | 'presence' | 'runtime' | 'board';

export interface NodeRealtimeEnvelope<TPayload = unknown> {
  readonly v: NodeRealtimeProtocolVersion;
  readonly channel: NodeRealtimeChannel;
  readonly type: string;
  readonly ts: string;
  readonly payload: TPayload;
}

/** Роли WebSocket-подключения к cabinet gateway. */
export type NodeRealtimeConnectionRole = 'node' | 'cabinet';
