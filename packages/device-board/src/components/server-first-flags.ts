import type {
  BoardCaptureStatePayload,
  BoardEditLeasePayload,
  DeviceCaptureMode,
  DeviceCaptureReleaseReason,
  RuntimeAuthority,
  RuntimeFollowerMode,
} from '@membrana/core';

import {
  isDeviceCaptureActive,
  type DeviceCaptureClientState,
} from './capture-flags.js';

/** Вход для server-first флагов полевого клиента (SF4/SF5 + capture v2 CT5). */
export interface ServerFirstFlagsInput {
  readonly deviceId: string | null;
  /** @deprecated Tariff v3 (edit lease вне тарифа v2). Удаляется в CT7. */
  readonly editLease: BoardEditLeasePayload | null;
  /** @deprecated v1 legacy — заменён осью `capture`. Удаляется в CT7. */
  readonly captureState: BoardCaptureStatePayload | null;
  /** v2: явный захват устройства кабинетом (канон §2). */
  readonly capture?: DeviceCaptureClientState | null;
  /** v2: WS потеряна при активном захвате (TTL-таймер идёт, канон §3). */
  readonly captureConnectionLost?: boolean;
  /** v2: причина последнего release — для badge «Отпущено». */
  readonly lastCaptureRelease?: DeviceCaptureReleaseReason | null;
  readonly nowMs?: number;
}

/** Производные флаги follower / edit lease для UI и runtime gating. */
export interface ServerFirstFlags {
  readonly cabinetEditLease: boolean;
  readonly authority: RuntimeAuthority | null;
  /** @deprecated v1 legacy — заменён на `captureMode`. Удаляется в CT7. */
  readonly followerMode: RuntimeFollowerMode | null;
  /** v2: устройство явно захвачено кабинетом (канон §2). */
  readonly capturedByCabinet: boolean;
  /** v2: режим активного захвата. */
  readonly captureMode: DeviceCaptureMode | null;
  /** v2: badge «Соединение потеряно» (WS упала при захвате). */
  readonly captureConnectionLost: boolean;
  /** v2: захват недавно отпущен — badge «Отпущено». */
  readonly recentlyReleased: boolean;
  readonly blockLocalRun: boolean;
  readonly allowFieldPause: boolean;
  readonly allowFieldStop: boolean;
  readonly allowFieldSetMode: boolean;
  /** Скрыть run cluster на поле (v1 strict follower; в v2 controls видимы). */
  readonly hideFieldRuntimeControls: boolean;
  /** v2: структура read-only под захватом (канон §4.2, любой режим). */
  readonly blockStructureEdit: boolean;
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
 * CX4: пока устройство захвачено кабинетом, полевой оператор заперт в борде —
 * выход разблокируется на release (канон: блокируем навигацию, НЕ звук —
 * emergency stop §3.3 работает всегда). Кабинетной перспективы не касается.
 */
export function isBoardExitLocked(
  flags: ServerFirstFlags | null,
  perspective: 'field' | 'cabinet',
): boolean {
  return perspective === 'field' && flags !== null && flags.capturedByCabinet;
}

/**
 * Единый источник server-first флагов для shell и runtime gating.
 * Pan/zoom не блокируются — только структура (isSessionReadOnly).
 *
 * CT5: при активном захвате v2 (`capture`) решает ось capture (канон §4.2):
 * soft — run/stop разрешены, edit/пауза нет; hard — только emergency stop;
 * controls остаются видимыми (disabled, канон §7). v1 legacy path
 * (captureState/authority) действует только без v2-захвата — до CT7.
 */
export function resolveServerFirstFlags(input: ServerFirstFlagsInput): ServerFirstFlags {
  const nowMs = input.nowMs ?? Date.now();
  const cabinetEditLease = isCabinetEditLeaseActive(input.editLease, input.deviceId, nowMs);
  const captureV2 = input.capture ?? null;
  const captureActive = isDeviceCaptureActive(captureV2, nowMs);

  if (captureActive) {
    const mode = captureV2!.mode;
    return {
      cabinetEditLease,
      authority: 'cabinet',
      followerMode: null,
      capturedByCabinet: true,
      captureMode: mode,
      captureConnectionLost: input.captureConnectionLost === true,
      recentlyReleased: false,
      blockLocalRun: mode === 'hard',
      allowFieldPause: false,
      allowFieldStop: true,
      allowFieldSetMode: false,
      hideFieldRuntimeControls: false,
      blockStructureEdit: true,
    };
  }

  const capture = resolveCaptureForDevice(input.captureState, input.deviceId);
  const authority = capture?.authority ?? null;
  const followerMode = capture?.followerMode ?? null;
  const releasedBase = {
    capturedByCabinet: false,
    captureMode: null,
    captureConnectionLost: false,
    recentlyReleased: input.lastCaptureRelease != null,
    blockStructureEdit: false,
  } as const;

  if (authority !== 'cabinet') {
    return {
      cabinetEditLease,
      authority,
      followerMode,
      ...releasedBase,
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
    ...releasedBase,
    blockLocalRun: true,
    allowFieldPause: !isStrict,
    allowFieldStop: !isStrict,
    allowFieldSetMode: !isStrict,
    hideFieldRuntimeControls: isStrict,
  };
}
