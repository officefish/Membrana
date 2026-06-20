/**
 * Wire-протокол MP7 для background-cabinet (CJS runtime).
 * Держать в синхронизации с `packages/core/src/contracts/node-realtime/`.
 */

export const NODE_REALTIME_PROTOCOL_V = 1 as const;

export type NodeRealtimeChannel = 'journal' | 'mic-live' | 'presence' | 'runtime';

export interface NodeRealtimeEnvelope<TPayload = unknown> {
  readonly v: typeof NODE_REALTIME_PROTOCOL_V;
  readonly channel: NodeRealtimeChannel;
  readonly type: string;
  readonly ts: string;
  readonly payload: TPayload;
}

export interface JournalAckPayload {
  readonly cursor: string;
  readonly clientEntryId: string;
}

export const NODE_REALTIME_EVENT_TYPES = {
  presence: {
    nodeOnline: 'node.online',
    nodeOffline: 'node.offline',
    sessionInvalidated: 'session.invalidated',
  },
  journal: {
    append: 'journal.append',
    acked: 'journal.acked',
    liveSession: 'journal.liveSession',
  },
  micLive: {
    session: 'mic.session',
    analysisBrief: 'analysis.brief',
    analysisLevel: 'analysis.level',
  },
  runtime: {
    command: 'runtime.command',
    state: 'runtime.state',
    log: 'runtime.log',
  },
} as const;

const MP7_CHANNELS: ReadonlySet<NodeRealtimeChannel> = new Set([
  'journal',
  'mic-live',
  'presence',
  'runtime',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseNodeRealtimeEnvelope(
  raw: unknown,
): { ok: true; value: NodeRealtimeEnvelope } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: 'Envelope must be an object' };
  }

  if (raw.v !== NODE_REALTIME_PROTOCOL_V) {
    return { ok: false, error: `Unsupported protocol version: ${String(raw.v)}` };
  }

  const channel = raw.channel;
  if (typeof channel !== 'string' || !MP7_CHANNELS.has(channel as NodeRealtimeChannel)) {
    return { ok: false, error: 'Invalid or missing channel' };
  }

  const type = raw.type;
  if (typeof type !== 'string' || type.trim().length === 0) {
    return { ok: false, error: 'Invalid or missing type' };
  }

  const ts = raw.ts;
  if (typeof ts !== 'string' || Number.isNaN(Date.parse(ts))) {
    return { ok: false, error: 'Invalid or missing ts (ISO 8601)' };
  }

  return {
    ok: true,
    value: {
      v: NODE_REALTIME_PROTOCOL_V,
      channel: channel as NodeRealtimeChannel,
      type: type.trim(),
      ts,
      payload: raw.payload,
    },
  };
}

export function createNodeRealtimeEnvelope<TPayload>(
  channel: NodeRealtimeChannel,
  type: string,
  payload: TPayload,
  ts: string = new Date().toISOString(),
): NodeRealtimeEnvelope<TPayload> {
  return {
    v: NODE_REALTIME_PROTOCOL_V,
    channel,
    type,
    ts,
    payload,
  };
}
