import type { RuntimeCommandPayload, RuntimeFollowerMode, RuntimeMode } from '@membrana/core';

/** @deprecated v1 legacy — заменён на DeviceCaptureMode (явный захват). Удаляется в CT7. */
export type CabinetRunFollowerMode = RuntimeFollowerMode;

/** Graceful стоп оператором (канон v2.0 §3.1); emergency = 0. */
export const CABINET_STOP_FADE_OUT_MS = 200;

/**
 * CT3 (tariff v2): запуск сохранённого сценария устройства. Захват — отдельный
 * явный шаг (REST /capture), поэтому команда не несёт authority/followerMode.
 * Gateway отвергнет команду без активного захвата (канон §4.1).
 */
export function buildCabinetRunScenarioCommand(deviceId: string): RuntimeCommandPayload {
  return { action: 'run', deviceId };
}

/** CT3 (tariff v2): стоп с graceful fade-out (по умолчанию 200 мс). */
export function buildCabinetStopScenarioCommand(
  deviceId: string,
  fadeOutMs: number = CABINET_STOP_FADE_OUT_MS,
): RuntimeCommandPayload {
  return { action: 'stop', deviceId, fadeOutMs };
}

/**
 * @deprecated v1 legacy — неявный захват через run. В v2 используйте
 * REST capture + buildCabinetRunScenarioCommand. Удаляется в CT7.
 */
export function buildCabinetRunCommand(
  deviceId: string,
  followerMode: CabinetRunFollowerMode = 'soft',
): RuntimeCommandPayload {
  return {
    action: 'run',
    deviceId,
    authority: 'cabinet',
    followerMode,
  };
}

/** @deprecated v1 legacy — используйте buildCabinetStopScenarioCommand. Удаляется в CT7. */
export function buildCabinetStopCommand(deviceId: string): RuntimeCommandPayload {
  return { action: 'stop', deviceId };
}

/** @deprecated Tariff v3 — паузы в тарифе v2 нет. Удаляется в CT7. */
export function buildCabinetPauseCommand(deviceId: string): RuntimeCommandPayload {
  return { action: 'pause', deviceId };
}

/** @deprecated Tariff v3 — паузы в тарифе v2 нет. Удаляется в CT7. */
export function buildCabinetResumeCommand(deviceId: string): RuntimeCommandPayload {
  return { action: 'resume', deviceId };
}

/** @deprecated Tariff v3 — setMode с сервера не входит в тариф v2. Удаляется в CT7. */
export function buildCabinetSetModeCommand(
  deviceId: string,
  mode: RuntimeMode,
): RuntimeCommandPayload {
  return { action: 'setMode', mode, deviceId };
}
