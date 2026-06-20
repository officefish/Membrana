import {
  NODE_REALTIME_PROTOCOL_V,
  type NodeRealtimeChannel,
  type NodeRealtimeEnvelope,
} from './envelope.js';

const MP7_CHANNELS: ReadonlySet<NodeRealtimeChannel> = new Set([
  'journal',
  'mic-live',
  'presence',
  'runtime',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Парсит и валидирует входящий JSON как NodeRealtimeEnvelope. */
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

/** Собирает исходящий envelope MP7. */
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
