/**
 * Явный захват устройства (тариф v2, канон DEVICE_BOARD_SERVER_FIRST.md v2.0).
 *
 * Захват — отдельный двухшаговый процесс (capture → select+run+stop),
 * НЕ побочный эффект `run` (ревизия v1). Без захвата у сервера нет контроля.
 */

/** Режим захвата: мягкий (поле может start/stop) / жёсткий (полностью ведомое). */
export type DeviceCaptureMode = 'soft' | 'hard';

/** Причина отпускания захвата. */
export type DeviceCaptureReleaseReason = 'operator' | 'ttl-expired' | 'server-restart';

/** Сервер шлёт heartbeat каждые 2 мин (канал `board`). */
export const DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS = 120_000;

/** TTL захвата: 5 мин без heartbeat → auto-release на клиенте. */
export const DEVICE_CAPTURE_TTL_MS = 300_000;

/** Graceful fade-out при вытеснении клиентского сценария захватом. */
export const CAPTURE_PREEMPTION_FADE_OUT_MS = 200;

/** Захват устройства кабинетом (канал `board`, событие `board.capture`). */
export interface BoardCapturePayload {
  readonly deviceId: string;
  readonly mode: DeviceCaptureMode;
  readonly sessionId: string;
  /** ISO 8601. */
  readonly acquiredAt: string;
  /** ISO 8601; продлевается heartbeat'ом. */
  readonly expiresAt: string;
}

/** Продление захвата (канал `board`, событие `board.heartbeat`). */
export interface BoardCaptureHeartbeatPayload {
  readonly deviceId: string;
  readonly sessionId: string;
  /** ISO 8601 — новый дедлайн TTL. */
  readonly expiresAt: string;
}

/**
 * Отпускание захвата (канал `board`, событие `board.release`).
 * Release НЕ останавливает играющий сценарий (канон §3).
 */
export interface BoardCaptureReleasePayload {
  readonly deviceId: string;
  /** null при auto-release без живой сессии (например ttl-expired). */
  readonly sessionId: string | null;
  readonly reason: DeviceCaptureReleaseReason;
}

/**
 * Runtime-команды кабинета, разрешённые тарифом (enforcement — gateway
 * whitelist в background-cabinet, канон §4.1; UI — вторичен).
 * Оба режима захвата дают кабинету одинаковый набор.
 */
export const TARIFF_CABINET_RUNTIME_COMMANDS = {
  /** Тариф v2: только выбор + запуск + остановка существующего сценария. */
  v2: ['selectScenario', 'run', 'stop'],
  /** Тариф v3 (будущий): + пауза/отладка, setMode, edit. */
  v3: ['selectScenario', 'run', 'stop', 'pause', 'resume', 'setMode'],
} as const;

export type TariffId = keyof typeof TARIFF_CABINET_RUNTIME_COMMANDS;

/** Локальные действия поля (клиента) по режиму захвата (канон §4.2). */
export type FieldLocalAction = 'run' | 'stop' | 'edit' | 'pause';

/**
 * Матрица действий поля. `hard.stop` — emergency stop (fadeOutMs=0),
 * доступен ВСЕГДА: инвариант — audio-engine не проверяет захват (канон §3.3).
 */
export const FIELD_ALLOWED_ACTIONS: Readonly<
  Record<DeviceCaptureMode | 'none', readonly FieldLocalAction[]>
> = {
  /** Захвата нет — полная автономия. */
  none: ['run', 'stop', 'edit', 'pause'],
  /** Мягкий: start/stop разрешены (last-write-win), edit и пауза заблокированы. */
  soft: ['run', 'stop'],
  /** Жёсткий: только emergency stop. */
  hard: ['stop'],
} as const;
