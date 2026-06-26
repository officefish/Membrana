import type {
  BoardCaptureStatePayload,
  BoardEditLeasePayload,
  RuntimeAuthority,
  RuntimeFollowerMode,
} from '@membrana/core';

/** Вход для server-first флагов полевого клиента (SF4/SF5). */
export interface ServerFirstFlagsInput {
  readonly deviceId: string | null;
  readonly editLease: BoardEditLeasePayload | null;
  readonly captureState: BoardCaptureStatePayload | null;
  readonly nowMs?: number;
}

/** Производные флаги follower / edit lease для UI и runtime gating. */
export interface ServerFirstFlags {
  readonly cabinetEditLease: boolean;
  readonly authority: RuntimeAuthority | null;
  readonly followerMode: RuntimeFollowerMode | null;
  readonly blockLocalRun: boolean;
  readonly allowFieldPause: boolean;
  readonly allowFieldStop: boolean;
  readonly allowFieldSetMode: boolean;
  /** Скрыть run cluster на поле (strict follower). */
  readonly hideFieldRuntimeControls: boolean;
}

export function isCabinetEditLeaseActive(
  lease: BoardEditLeasePayload | null,
  deviceId: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (deviceId === null || lease === null || lease.deviceId !== deviceId) {
    return false;
  }
  if (lease.holder !== 'cabinet') {
    return false;
  }
  if (lease.expiresAt === null) {
    return true;
  }
  const expires = Date.parse(lease.expiresAt);
  return Number.isFinite(expires) && expires > nowMs;
}

function resolveCaptureForDevice(
  capture: BoardCaptureStatePayload | null,
  deviceId: string | null,
): BoardCaptureStatePayload | null {
  if (deviceId === null || capture === null || capture.deviceId !== deviceId) {
    return null;
  }
  return capture;
}

/**
 * Единый источник server-first флагов для shell и runtime gating.
 * Pan/zoom не блокируются — только структура (через cabinetEditLease → isSessionReadOnly).
 */
export function resolveServerFirstFlags(input: ServerFirstFlagsInput): ServerFirstFlags {
  const nowMs = input.nowMs ?? Date.now();
  const cabinetEditLease = isCabinetEditLeaseActive(input.editLease, input.deviceId, nowMs);
  const capture = resolveCaptureForDevice(input.captureState, input.deviceId);
  const authority = capture?.authority ?? null;
  const followerMode = capture?.followerMode ?? null;

  if (authority !== 'cabinet') {
    return {
      cabinetEditLease,
      authority,
      followerMode,
      blockLocalRun: false,
      allowFieldPause: true,
      allowFieldStop: true,
      allowFieldSetMode: true,
      hideFieldRuntimeControls: false,
    };
  }

  const isStrict = followerMode === 'strict';
  return {
    cabinetEditLease,
    authority,
    followerMode,
    blockLocalRun: true,
    allowFieldPause: !isStrict,
    allowFieldStop: !isStrict,
    allowFieldSetMode: !isStrict,
    hideFieldRuntimeControls: isStrict,
  };
}
