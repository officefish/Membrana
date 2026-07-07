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
  BoardScenarioListItem,
  BoardScenarioListPayload,
  DeviceCaptureMode,
  DeviceCaptureReleaseReason,
} from './capture-events.js';
import type {
  PresenceHeartbeatPayload,
  PresenceSnapshotPayload,
  RuntimeCommandPayload,
} from './events.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
 * CT7 (канон §9): `pause`/`resume`/`setMode` и `authority`/`followerMode`
 * на run удалены из wire — такие payload'ы отбрасываются.
 * // Tariff v3: вернуть pause/resume/setMode.
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

/**
 * PL1: валидирует presence.snapshot. onlineDeviceIds — массив непустых строк
 * (пустой массив допустим: узлов онлайн нет). Дубликаты и не-строки отбрасываются.
 */
export function parsePresenceSnapshotPayload(raw: unknown): PresenceSnapshotPayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (!Array.isArray(raw.onlineDeviceIds) || typeof raw.timestampMs !== 'number') {
    return null;
  }
  if (!raw.onlineDeviceIds.every((id) => isNonEmptyString(id))) {
    return null;
  }
  return {
    onlineDeviceIds: [...new Set(raw.onlineDeviceIds as string[])],
    timestampMs: raw.timestampMs,
  };
}

/** Валидирует presence.heartbeat (node → server). */
export function parsePresenceHeartbeatPayload(raw: unknown): PresenceHeartbeatPayload | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.deviceId)) {
    return null;
  }
  if (
    typeof raw.timestampMs !== 'number' ||
    !Number.isFinite(raw.timestampMs) ||
    raw.timestampMs < 0
  ) {
    return null;
  }
  return { deviceId: raw.deviceId, timestampMs: raw.timestampMs };
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

function parseScenarioListItem(raw: unknown): BoardScenarioListItem | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.id) || !isNonEmptyString(raw.title)) {
    return null;
  }
  return { id: raw.id, title: raw.title };
}

/**
 * CX3: валидирует board.scenario-list payload. Инвариант «один всегда выбран»
 * проверяется структурно: selectedScenarioId обязан указывать на элемент
 * списка; null допустим только при пустом списке.
 */
export function parseBoardScenarioListPayload(raw: unknown): BoardScenarioListPayload | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.deviceId) || !Array.isArray(raw.scenarios)) {
    return null;
  }
  const scenarios: BoardScenarioListItem[] = [];
  const seen = new Set<string>();
  for (const item of raw.scenarios) {
    const parsed = parseScenarioListItem(item);
    if (parsed === null || seen.has(parsed.id)) {
      return null;
    }
    seen.add(parsed.id);
    scenarios.push(parsed);
  }
  const selected = raw.selectedScenarioId;
  if (scenarios.length === 0) {
    if (selected !== null && selected !== undefined) {
      return null;
    }
    return { deviceId: raw.deviceId, scenarios, selectedScenarioId: null };
  }
  if (!isNonEmptyString(selected) || !seen.has(selected)) {
    return null;
  }
  return { deviceId: raw.deviceId, scenarios, selectedScenarioId: selected };
}
