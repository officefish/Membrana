/**
 * Явный захват устройства — доменные константы и tariff whitelist
 * (tariff v2, канон DEVICE_BOARD_SERVER_FIRST.md v2.0).
 * Синхрон с packages/core/src/contracts/node-realtime/capture-events.ts.
 */

/** Сервер шлёт heartbeat каждые 2 мин (канал `board`). */
export const DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS = 120_000;

/** TTL захвата: 5 мин без heartbeat → auto-release. */
export const DEVICE_CAPTURE_TTL_MS = 300_000;

/** Graceful fade-out при вытеснении клиентского сценария захватом. */
export const CAPTURE_PREEMPTION_FADE_OUT_MS = 200;

export function deviceCaptureExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + DEVICE_CAPTURE_TTL_MS);
}

export function isDeviceCaptureActive(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}

/**
 * Runtime-команды кабинета, разрешённые тарифом (канон §4.1).
 * Единственная точка enforcement — gateway; UI вторичен.
 */
export const TARIFF_CABINET_RUNTIME_COMMANDS = {
  /** Тариф v2: только выбор + запуск + остановка существующего сценария. */
  v2: ['selectScenario', 'run', 'stop'],
  /** Тариф v3 (будущий): + пауза/отладка, setMode. */
  v3: ['selectScenario', 'run', 'stop', 'pause', 'resume', 'setMode'],
} as const;

export type CabinetTariffId = keyof typeof TARIFF_CABINET_RUNTIME_COMMANDS;

/** Активный тариф контура. До биллинга per-membrane — константа v2. */
export const ACTIVE_CABINET_TARIFF: CabinetTariffId = 'v2';

export function isCabinetRuntimeCommandAllowed(
  action: string,
  tariff: CabinetTariffId = ACTIVE_CABINET_TARIFF,
): boolean {
  return (TARIFF_CABINET_RUNTIME_COMMANDS[tariff] as readonly string[]).includes(action);
}
