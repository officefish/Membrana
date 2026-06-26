/**
 * Wire-протокол MP7 для background-cabinet (CJS runtime).
 * Держать в синхронизации с `packages/core/src/contracts/node-realtime/`.
 */

export const NODE_REALTIME_PROTOCOL_V = 1 as const;

export type NodeRealtimeChannel = 'journal' | 'mic-live' | 'presence' | 'runtime' | 'board';

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
  board: {
    editLease: 'board.edit-lease',
    captureState: 'board.capture-state',
  },
} as const;

const MP7_CHANNELS: ReadonlySet<NodeRealtimeChannel> = new Set([
  'journal',
  'mic-live',
  'presence',
  'runtime',
  'board',
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

// --- Board payloads (синхрон с packages/core/src/contracts/node-realtime/) ---

export type BoardEditLeaseHolder = 'cabinet' | 'field' | 'none';

export interface BoardEditLeasePayload {
  readonly deviceId: string;
  readonly holder: BoardEditLeaseHolder;
  readonly sessionId: string | null;
  readonly revision: number;
  readonly expiresAt: string | null;
}

export type RuntimeAuthority = 'cabinet' | 'field';

export type RuntimeFollowerMode = 'soft' | 'strict';

export interface BoardCaptureStatePayload {
  readonly deviceId: string;
  readonly authority: RuntimeAuthority;
  readonly followerMode: RuntimeFollowerMode | null;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRuntimeAuthority(value: unknown): value is RuntimeAuthority {
  return value === 'cabinet' || value === 'field';
}

function isFollowerMode(value: unknown): value is RuntimeFollowerMode {
  return value === 'soft' || value === 'strict';
}

function isLeaseHolder(value: unknown): value is BoardEditLeaseHolder {
  return value === 'cabinet' || value === 'field' || value === 'none';
}

/** Валидирует board.edit-lease payload. */
export function parseBoardEditLeasePayload(raw: unknown): BoardEditLeasePayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (!isNonEmptyString(raw.deviceId) || !isLeaseHolder(raw.holder)) {
    return null;
  }
  const revision = raw.revision;
  if (typeof revision !== 'number' || !Number.isFinite(revision) || revision < 0) {
    return null;
  }
  const sessionId = raw.sessionId;
  if (sessionId !== null && sessionId !== undefined && typeof sessionId !== 'string') {
    return null;
  }
  const expiresAt = raw.expiresAt;
  if (expiresAt !== null && expiresAt !== undefined) {
    if (typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt))) {
      return null;
    }
  }
  if (raw.holder === 'cabinet' && (sessionId === null || sessionId === undefined)) {
    return null;
  }
  return {
    deviceId: raw.deviceId,
    holder: raw.holder,
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    revision,
    expiresAt: typeof expiresAt === 'string' ? expiresAt : null,
  };
}

/** Валидирует board.capture-state payload. */
export function parseBoardCaptureStatePayload(raw: unknown): BoardCaptureStatePayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (!isNonEmptyString(raw.deviceId) || !isRuntimeAuthority(raw.authority)) {
    return null;
  }
  if (typeof raw.isRunning !== 'boolean' || typeof raw.isPaused !== 'boolean') {
    return null;
  }
  const followerMode = raw.followerMode;
  if (followerMode !== null && followerMode !== undefined && !isFollowerMode(followerMode)) {
    return null;
  }
  if (raw.authority === 'field' && followerMode !== null && followerMode !== undefined) {
    return null;
  }
  return {
    deviceId: raw.deviceId,
    authority: raw.authority,
    followerMode:
      followerMode === null || followerMode === undefined
        ? raw.authority === 'cabinet'
          ? 'soft'
          : null
        : followerMode,
    isRunning: raw.isRunning,
    isPaused: raw.isPaused,
  };
}
