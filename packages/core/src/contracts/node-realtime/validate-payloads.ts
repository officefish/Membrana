import type {
  BoardCaptureStatePayload,
  BoardEditLeaseHolder,
  BoardEditLeasePayload,
  RuntimeAuthority,
  RuntimeFollowerMode,
} from './board-events.js';
import type {
  BoardCaptureHeartbeatPayload,
  BoardCapturePayload,
  BoardCaptureReleasePayload,
  DeviceCaptureMode,
  DeviceCaptureReleaseReason,
} from './capture-events.js';
import type { RuntimeCommandPayload, RuntimeMode } from './events.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRuntimeMode(value: unknown): value is RuntimeMode {
  return value === 'normal' || value === 'alarm';
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

function isCaptureMode(value: unknown): value is DeviceCaptureMode {
  return value === 'soft' || value === 'hard';
}

function isCaptureReleaseReason(value: unknown): value is DeviceCaptureReleaseReason {
  return value === 'operator' || value === 'ttl-expired' || value === 'server-restart';
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseOptionalDeviceId(raw: Record<string, unknown>): string | undefined {
  const deviceId = raw.deviceId;
  if (deviceId === undefined) {
    return undefined;
  }
  return isNonEmptyString(deviceId) ? deviceId : undefined;
}

/**
 * Валидирует payload runtime.command. Возвращает null при неизвестном action.
 * `followerMode` допустим только при `action: run` и `authority: cabinet`.
 */
export function parseRuntimeCommandPayload(raw: unknown): RuntimeCommandPayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  const action = raw.action;
  const deviceId = parseOptionalDeviceId(raw);

  switch (action) {
    case 'run': {
      const authority = raw.authority;
      const followerMode = raw.followerMode;
      const scenarioId = raw.scenarioId;
      if (authority !== undefined && !isRuntimeAuthority(authority)) {
        return null;
      }
      if (followerMode !== undefined && !isFollowerMode(followerMode)) {
        return null;
      }
      if (followerMode !== undefined && authority !== 'cabinet') {
        return null;
      }
      if (scenarioId !== undefined && !isNonEmptyString(scenarioId)) {
        return null;
      }
      return {
        action: 'run',
        ...(deviceId !== undefined ? { deviceId } : {}),
        ...(isNonEmptyString(scenarioId) ? { scenarioId } : {}),
        ...(isRuntimeAuthority(authority) ? { authority } : {}),
        ...(isFollowerMode(followerMode) ? { followerMode } : {}),
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
    case 'pause':
      return { action: 'pause', ...(deviceId !== undefined ? { deviceId } : {}) };
    case 'resume':
      return { action: 'resume', ...(deviceId !== undefined ? { deviceId } : {}) };
    case 'setMode': {
      const mode = raw.mode;
      if (!isRuntimeMode(mode)) {
        return null;
      }
      return {
        action: 'setMode',
        mode,
        ...(deviceId !== undefined ? { deviceId } : {}),
      };
    }
    default:
      return null;
  }
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

/** Валидирует board.capture payload (тариф v2, канон §6). */
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

/** Валидирует board.heartbeat payload (продление TTL захвата). */
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
