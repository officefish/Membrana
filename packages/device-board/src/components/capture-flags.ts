import type { DeviceCaptureMode } from '@membrana/core';

/**
 * Снимок явного захвата устройства на клиенте (тариф v2,
 * канон DEVICE_BOARD_SERVER_FIRST.md v2.0 §2). holder подразумевается
 * 'cabinet', когда снимок не null.
 */
export interface DeviceCaptureClientState {
  readonly mode: DeviceCaptureMode;
  readonly sessionId: string;
  /** ISO 8601; продлевается board.heartbeat. */
  readonly expiresAt: string;
}

/** Разрешённые локальные действия поля по режиму захвата (канон §4.2). */
export interface DeviceCaptureFlags {
  readonly captured: boolean;
  readonly mode: DeviceCaptureMode | null;
  /** Локальный run: разрешён без захвата и при мягком (last-write-win, канон §3.2). */
  readonly allowFieldRun: boolean;
  /**
   * Локальный stop: ВСЕГДА true — emergency stop не отключается никаким
   * режимом (инвариант канона §3.3, audio-engine без permission-check).
   */
  readonly allowFieldStop: boolean;
  /** Редактирование графа: только без захвата. */
  readonly allowFieldEdit: boolean;
  /** Пауза: только без захвата (в тарифе v2 паузы под захватом нет). */
  readonly allowFieldPause: boolean;
}

const RELEASED_FLAGS: DeviceCaptureFlags = {
  captured: false,
  mode: null,
  allowFieldRun: true,
  allowFieldStop: true,
  allowFieldEdit: true,
  allowFieldPause: true,
};

export function isDeviceCaptureActive(
  capture: DeviceCaptureClientState | null,
  nowMs: number = Date.now(),
): boolean {
  if (capture === null) {
    return false;
  }
  const expires = Date.parse(capture.expiresAt);
  return Number.isFinite(expires) && expires > nowMs;
}

/**
 * Единый источник enforcement-флагов поля для осей v2 (capture + authority).
 * Протухший захват (TTL) эквивалентен отпущенному — автономия восстановлена.
 */
export function resolveDeviceCaptureFlags(
  capture: DeviceCaptureClientState | null,
  nowMs: number = Date.now(),
): DeviceCaptureFlags {
  if (!isDeviceCaptureActive(capture, nowMs)) {
    return RELEASED_FLAGS;
  }
  const mode = capture!.mode;
  return {
    captured: true,
    mode,
    allowFieldRun: mode === 'soft',
    allowFieldStop: true,
    allowFieldEdit: false,
    allowFieldPause: false,
  };
}
