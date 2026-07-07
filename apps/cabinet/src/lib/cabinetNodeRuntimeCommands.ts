import type { RuntimeCommandPayload } from '@membrana/core';

/** Graceful стоп оператором (канон v2.0 §3.1); emergency = 0. */
export const CABINET_STOP_FADE_OUT_MS = 200;

/**
 * CT3 (tariff v2): запуск сохранённого сценария устройства. Захват — отдельный
 * явный шаг (REST /capture), поэтому команда не несёт authority/followerMode.
 * Gateway отвергнет команду без активного захвата (канон §4.1).
 */
export function buildCabinetRunScenarioCommand(
  deviceId: string,
  scenarioId?: string,
): RuntimeCommandPayload {
  // CX3: запуск конкретного выбранного сценария (wire v2 поддерживает
  // run{scenarioId}); без scenarioId — сохранённый сценарий устройства.
  return scenarioId !== undefined
    ? { action: 'run', deviceId, scenarioId }
    : { action: 'run', deviceId };
}

/** CX3: выбор сценария из объявленного узлом списка (tariff v2 whitelist). */
export function buildCabinetSelectScenarioCommand(
  deviceId: string,
  scenarioId: string,
): RuntimeCommandPayload {
  return { action: 'selectScenario', deviceId, scenarioId };
}

/** CT3 (tariff v2): стоп с graceful fade-out (по умолчанию 200 мс). */
export function buildCabinetStopScenarioCommand(
  deviceId: string,
  fadeOutMs: number = CABINET_STOP_FADE_OUT_MS,
): RuntimeCommandPayload {
  return { action: 'stop', deviceId, fadeOutMs };
}

// CT7 (канон §9): v1-билдеры удалены.
// Tariff v3: buildCabinetPauseCommand / buildCabinetResumeCommand /
// buildCabinetSetModeCommand / неявный run с authority+followerMode.
