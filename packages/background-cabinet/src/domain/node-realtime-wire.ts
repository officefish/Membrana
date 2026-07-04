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

/** PCB6: проба живости узла (server → node). */
export interface HealthPingPayload {
  readonly pingId: string;
  readonly sentAt: number;
}

/** PCB6: ответ узла на пробу (node → server). */
export interface HealthPongPayload {
  readonly pingId: string;
}

/** Валидирует health.pong payload (node → server). */
export function parseHealthPongPayload(raw: unknown): HealthPongPayload | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const pingId = (raw as { pingId?: unknown }).pingId;
  if (typeof pingId !== 'string' || pingId.trim().length === 0) {
    return null;
  }
  return { pingId };
}

export const NODE_REALTIME_EVENT_TYPES = {
  presence: {
    /** PL1: снапшот присутствия кабинету при подключении (bootstrap online-набора). */
    snapshot: 'presence.snapshot',
    nodeOnline: 'node.online',
    nodeOffline: 'node.offline',
    sessionInvalidated: 'session.invalidated',
    /** PCB6: активная проба живости (server → node). */
    healthPing: 'health.ping',
    /** PCB6: ответ узла на пробу (node → server). */
    healthPong: 'health.pong',
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
    /** @deprecated Tariff v3 (edit lease вне тарифа v2). Удаляется в CT7. */
    editLease: 'board.edit-lease',
    /** @deprecated v1 legacy — заменён парой capture/release. Удаляется в CT7. */
    captureState: 'board.capture-state',
    /** v2: явный захват устройства кабинетом. */
    capture: 'board.capture',
    /** v2: продление TTL захвата (каждые 2 мин). */
    heartbeat: 'board.heartbeat',
    /** v2: отпускание захвата (НЕ стоп играющего сценария). */
    release: 'board.release',
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

// --- Capture tariff v2 (синхрон с packages/core capture-events.ts, CT1) ---

/** Режим захвата: мягкий (поле может start/stop) / жёсткий (полностью ведомое). */
export type DeviceCaptureMode = 'soft' | 'hard';

/** Причина отпускания захвата. */
export type DeviceCaptureReleaseReason = 'operator' | 'ttl-expired' | 'server-restart';

/** Захват устройства кабинетом (канал `board`, событие `board.capture`). */
export interface BoardCapturePayload {
  readonly deviceId: string;
  readonly mode: DeviceCaptureMode;
  readonly sessionId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

/** Продление захвата (канал `board`, событие `board.heartbeat`). */
export interface BoardCaptureHeartbeatPayload {
  readonly deviceId: string;
  readonly sessionId: string;
  readonly expiresAt: string;
}

/** Отпускание захвата (канал `board`, событие `board.release`). */
export interface BoardCaptureReleasePayload {
  readonly deviceId: string;
  readonly sessionId: string | null;
  readonly reason: DeviceCaptureReleaseReason;
}

function isCaptureMode(value: unknown): value is DeviceCaptureMode {
  return value === 'soft' || value === 'hard';
}

function isCaptureReleaseReason(value: unknown): value is DeviceCaptureReleaseReason {
  return value === 'operator' || value === 'ttl-expired' || value === 'server-restart';
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Валидирует board.capture payload (тариф v2). */
export function parseBoardCapturePayload(raw: unknown): BoardCapturePayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (!isNonEmptyString(raw.deviceId) || !isCaptureMode(raw.mode)) {
    return null;
  }
  if (!isNonEmptyString(raw.sessionId)) {
    return null;
  }
  if (!isIsoDateString(raw.acquiredAt) || !isIsoDateString(raw.expiresAt)) {
    return null;
  }
  return {
    deviceId: raw.deviceId,
    mode: raw.mode,
    sessionId: raw.sessionId,
    acquiredAt: raw.acquiredAt,
    expiresAt: raw.expiresAt,
  };
}

/** Валидирует board.heartbeat payload. */
export function parseBoardCaptureHeartbeatPayload(
  raw: unknown,
): BoardCaptureHeartbeatPayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (!isNonEmptyString(raw.deviceId) || !isNonEmptyString(raw.sessionId)) {
    return null;
  }
  if (!isIsoDateString(raw.expiresAt)) {
    return null;
  }
  return {
    deviceId: raw.deviceId,
    sessionId: raw.sessionId,
    expiresAt: raw.expiresAt,
  };
}

/** Валидирует board.release payload. Release НЕ останавливает играющий сценарий. */
export function parseBoardCaptureReleasePayload(raw: unknown): BoardCaptureReleasePayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (!isNonEmptyString(raw.deviceId) || !isCaptureReleaseReason(raw.reason)) {
    return null;
  }
  const sessionId = raw.sessionId;
  if (sessionId !== null && sessionId !== undefined && !isNonEmptyString(sessionId)) {
    return null;
  }
  return {
    deviceId: raw.deviceId,
    sessionId: isNonEmptyString(sessionId) ? sessionId : null,
    reason: raw.reason,
  };
}

// --- Runtime command (синхрон с packages/core events.ts + validate-payloads.ts, CT1) ---

export type RuntimeMode = 'normal' | 'alarm';

/**
 * Команда кабинета узлу по каналу `runtime`. Тариф v2: только
 * selectScenario/run/stop (gateway whitelist, канон §4.1).
 * CT7 (канон §9): v1-поверхность удалена из wire.
 * // Tariff v3: pause / resume / setMode; authority/followerMode на run.
 */
export type RuntimeCommandPayload =
  | {
      readonly action: 'run';
      readonly deviceId?: string;
      readonly scenarioId?: string;
    }
  | {
      readonly action: 'selectScenario';
      readonly scenarioId: string;
      readonly deviceId?: string;
    }
  | {
      readonly action: 'stop';
      readonly deviceId?: string;
      /** 0 = hard-cut (emergency stop); 200 = graceful вытеснение. */
      readonly fadeOutMs?: number;
    };

function parseOptionalDeviceId(raw: Record<string, unknown>): string | undefined {
  const deviceId = raw.deviceId;
  if (deviceId === undefined) {
    return undefined;
  }
  return isNonEmptyString(deviceId) ? deviceId : undefined;
}

/**
 * Валидирует payload runtime.command. Возвращает null при неизвестном action.
 * CT7: pause/resume/setMode и authority/followerMode отбрасываются.
 */
export function parseRuntimeCommandPayload(raw: unknown): RuntimeCommandPayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  const action = raw.action;
  const deviceId = parseOptionalDeviceId(raw);

  switch (action) {
    case 'run': {
      const scenarioId = raw.scenarioId;
      if (scenarioId !== undefined && !isNonEmptyString(scenarioId)) {
        return null;
      }
      return {
        action: 'run',
        ...(deviceId !== undefined ? { deviceId } : {}),
        ...(isNonEmptyString(scenarioId) ? { scenarioId } : {}),
      };
    }
    case 'selectScenario': {
      if (!isNonEmptyString(raw.scenarioId)) {
        return null;
      }
      return {
        action: 'selectScenario',
        scenarioId: raw.scenarioId,
        ...(deviceId !== undefined ? { deviceId } : {}),
      };
    }
    case 'stop': {
      const fadeOutMs = raw.fadeOutMs;
      if (fadeOutMs !== undefined) {
        if (typeof fadeOutMs !== 'number' || !Number.isFinite(fadeOutMs) || fadeOutMs < 0) {
          return null;
        }
      }
      return {
        action: 'stop',
        ...(deviceId !== undefined ? { deviceId } : {}),
        ...(fadeOutMs !== undefined ? { fadeOutMs } : {}),
      };
    }
    default:
      return null;
  }
}
