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

/** csp-1: происхождение сценария в списке узла. Отсутствие поля = 'user' (backward-compat). */
export type ScenarioListItemKind = 'user' | 'system';

/** csp-1: тарифное право на системный сценарий (совпадает с карточкой клиента). */
export type ScenarioListItemEntitlement = 'bundled' | 'community' | 'entitled' | 'locked';

/**
 * CX3 + csp-1: сценарий в объявляемом узлом списке. Базово — id + имя;
 * системные (по тарифу) сценарии несут `kind:'system'` + карточные поля для
 * UI-паритета с клиентским пикером. Все поля сверх id/title — опциональны и
 * additive: старый узел без них парсится как раньше, `kind` отсутствует → 'user'.
 */
export interface BoardScenarioListItem {
  readonly id: string;
  readonly title: string;
  readonly kind?: ScenarioListItemKind;
  readonly description?: string;
  readonly entitlement?: ScenarioListItemEntitlement;
  readonly branchCount?: number;
  readonly functionCount?: number;
}

/** csp-1: эффективный kind элемента — отсутствие поля трактуем как 'user'. */
export function resolveScenarioItemKind(item: BoardScenarioListItem): ScenarioListItemKind {
  return item.kind ?? 'user';
}

/**
 * CX3: список сценариев узла (канал `board`, событие `board.scenario-list`,
 * node → server → cabinet). Узел объявляет при захвате и при изменении набора
 * под захватом; сервер хранит список + выбранный id, тел сценариев не хранит.
 * Инвариант: `selectedScenarioId` указывает на элемент списка; `null` — только
 * при пустом списке (см. normalizeScenarioSelection).
 */
export interface BoardScenarioListPayload {
  readonly deviceId: string;
  readonly scenarios: readonly BoardScenarioListItem[];
  readonly selectedScenarioId: string | null;
}

/**
 * csp-2/G1: тарифный контекст узла (server → node на коннекте). Узел кладёт
 * `entitledTariffSkus` в device-board config (вместо стаба) и по нему решает,
 * какие СИСТЕМНЫЕ (tier:'tariff') UserCases разрешены; bundled-сценарии доступны
 * всегда вне зависимости от этого списка.
 */
export interface NodeEntitlementsPayload {
  readonly tariffId: string;
  readonly entitledTariffSkus: readonly string[];
}

/**
 * CX3: инвариант «один сценарий всегда выбран». Возвращает `preferredId`, если
 * он есть в списке; иначе первый сценарий; `null` — только при пустом списке.
 * Чистая функция — используется узлом при объявлении и сервером при
 * `selectScenario`/сжатии списка.
 */
export function normalizeScenarioSelection(
  scenarios: readonly BoardScenarioListItem[],
  preferredId: string | null | undefined,
): string | null {
  if (preferredId != null && scenarios.some((scenario) => scenario.id === preferredId)) {
    return preferredId;
  }
  const first = scenarios[0];
  return first === undefined ? null : first.id;
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
