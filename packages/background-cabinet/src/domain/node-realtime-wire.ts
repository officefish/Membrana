/**
 * GENERATED FROM packages/core/src/contracts/node-realtime/ — DO NOT EDIT.
 *
 * Wire-контракт node-realtime для background-cabinet (CJS runtime). Источник
 * истины — @membrana/core; этот файл собирается генератором и сверяется
 * freshness-гейтом (yarn verify:wire-sync, pre-push).
 *
 * Перегенерация: yarn wire:generate
 */

// ===== from packages/core/src/contracts/node-realtime/envelope.ts =====

/** Версия wire-протокола MP7 (Node Realtime Gateway). */
export const NODE_REALTIME_PROTOCOL_V = 1 as const;

export type NodeRealtimeProtocolVersion = typeof NODE_REALTIME_PROTOCOL_V;

/** Каналы MP7. `runtime` — MP7b; `board` — server-first edit lease / capture (SF1). */
export type NodeRealtimeChannel = 'journal' | 'mic-live' | 'presence' | 'runtime' | 'board';

export interface NodeRealtimeEnvelope<TPayload = unknown> {
  readonly v: NodeRealtimeProtocolVersion;
  readonly channel: NodeRealtimeChannel;
  readonly type: string;
  readonly ts: string;
  readonly payload: TPayload;
}

/** Роли WebSocket-подключения к cabinet gateway. */
export type NodeRealtimeConnectionRole = 'node' | 'cabinet';

// ===== from packages/core/src/contracts/node-realtime/board-events.ts =====

/**
 * Кто держит edit lease на сценарий узла (server-first SF1).
 * @deprecated Tariff v3 — edit lease вне тарифа v2 (канон v2.0 §9). Удаляется в CT7.
 */
export type BoardEditLeaseHolder = 'cabinet' | 'field' | 'none';

/**
 * Снимок edit lease (канал `board`, событие `board.edit-lease`).
 * @deprecated Tariff v3 — edit lease вне тарифа v2 (канон v2.0 §9). Удаляется в CT7.
 */
export interface BoardEditLeasePayload {
  readonly deviceId: string;
  readonly holder: BoardEditLeaseHolder;
  /** Идентификатор сессии кабинета; null при holder !== cabinet. */
  readonly sessionId: string | null;
  /** Версия документа сценария на момент lease. */
  readonly revision: number;
  /** ISO 8601; null = бессрочно (не рекомендуется в prod). */
  readonly expiresAt: string | null;
}

/** Чья команда `run` выполнялась последней (last-write-win, канон v2.0 §3.2). */
export type RuntimeAuthority = 'cabinet' | 'field';

/**
 * Режим follower при authority=cabinet.
 * @deprecated v1 legacy — заменён на `DeviceCaptureMode` (`capture.mode`). Удаляется в CT7.
 */
export type RuntimeFollowerMode = 'soft' | 'strict';

/**
 * Broadcast capture authority (канал `board`, событие `board.capture-state`).
 * @deprecated v1 legacy — заменён парой `board.capture` / `board.release`. Удаляется в CT7.
 */
export interface BoardCaptureStatePayload {
  readonly deviceId: string;
  readonly authority: RuntimeAuthority;
  readonly followerMode: RuntimeFollowerMode | null;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
}

// ===== from packages/core/src/contracts/node-realtime/capture-events.ts =====

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

// ===== from packages/core/src/contracts/node-realtime/events.ts =====

/** Курсор reconnect (per deviceId). */
export interface JournalAckPayload {
  readonly cursor: string;
  readonly clientEntryId: string;
}

/** Slim DTO для journal.append (совместим с cabinet createReport/createLiveRecord). */
export interface JournalAppendPayload {
  readonly kind: 'report' | 'track';
  readonly clientEntryId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly reportKind: string;
  readonly finishedAt?: string;
  readonly startedAt?: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly tags?: readonly string[];
  /** Опциональный pre-mapped item для cabinet UI без REST round-trip. */
  readonly item?: Readonly<Record<string, unknown>>;
}

export interface JournalLiveSessionPayload {
  readonly clientRecordId: string;
  readonly moduleId: string;
  readonly recordKind: string;
  readonly startedAt: string;
  readonly status: 'active' | 'ended';
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface MicSessionPayload {
  readonly sessionId: string;
  readonly analysisMode: 'stream-manual' | 'stream-auto' | 'track-import' | 'idle';
  readonly active: boolean;
}

export interface AnalysisBriefPayload {
  readonly schema: string;
  readonly reportId: string;
  readonly trackId: string;
  readonly isDetected: boolean;
  readonly confidence?: number;
  readonly summaryText?: string;
}

export interface AnalysisLevelPayload {
  readonly rms: number;
  readonly peak?: number;
}

export interface NodeOnlinePayload {
  readonly deviceId: string;
  readonly nodeId: string;
  readonly membraneId: string;
}

/**
 * PL1 (pairing-lifecycle): снапшот присутствия, отправляемый кабинету один раз
 * при подключении — bootstrap набора онлайн-узлов до потока nodeOnline/Offline.
 * Закрывает offline-desync: узел, связавшийся до открытия кабинета, был невидим.
 */
export interface PresenceSnapshotPayload {
  readonly onlineDeviceIds: readonly string[];
  readonly timestampMs: number;
}

/** PL2b: периодический сигнал присутствия узла (node → server). */
export interface PresenceHeartbeatPayload {
  readonly deviceId: string;
  readonly timestampMs: number;
}

export const NODE_PRESENCE_HEARTBEAT_INTERVAL_MS = 120_000;

export const NODE_RECENT_PRESENCE_WINDOW_MS = 300_000;

export interface SessionInvalidatedPayload {
  readonly reason: 'revoked' | 'expired' | 'session_expired';
}

/**
 * PCB6 (presence-capture-board): активная проба живости узла (cabinet → server →
 * node). Сервер шлёт `health.ping` с nonce; узел отвечает `health.pong` с тем же
 * `pingId`. `sentAt` — серверный Date.now() (мс) для расчёта latencyMs.
 */
export interface HealthPingPayload {
  readonly pingId: string;
  readonly sentAt: number;
}

/** PCB6: ответ узла на health.ping (node → server). */
export interface HealthPongPayload {
  readonly pingId: string;
}

/** Режим исполнения device-board runtime (MP7b). */
export type RuntimeMode = 'normal' | 'alarm';

/**
 * Команда кабинета узлу по каналу `runtime` (cabinet → server → node).
 * Тариф v2 (канон DEVICE_BOARD_SERVER_FIRST.md v2.0): кабинету доступны
 * только `selectScenario` / `run` / `stop` — и только при активном захвате
 * (`board.capture`). Enforcement — gateway whitelist (канон §4.1).
 * `deviceId` — целевой узел (multi-node, MP7b RT5).
 *
 * CT7: v1-поверхность удалена из wire (канон §9).
 * // Tariff v3: pause / resume / setMode; authority/followerMode на run.
 */
export type RuntimeCommandPayload =
  | {
      readonly action: 'run';
      readonly deviceId?: string;
      /** v2: запуск конкретного существующего сценария (после selectScenario). */
      readonly scenarioId?: string;
    }
  | {
      readonly action: 'selectScenario';
      readonly scenarioId: string;
      readonly deviceId?: string;
    }
  | {
      readonly action: 'stop';
      readonly deviceId?: string;
      /** 0 = hard-cut (emergency stop); 200 = graceful вытеснение (канон §3.1). */
      readonly fadeOutMs?: number;
    };

/** Снимок состояния runtime (node → server → cabinet). Только скаляры, без кадров. */
export interface RuntimeStatePayload {
  /** Узел-источник состояния (multi-node, MP7b RT5) — для маппинга на карточку в кабинете. */
  readonly deviceId?: string;
  readonly phase:
    | 'idle'
    | 'initial'
    | 'main'
    | 'alarm'
    | 'onStop'
    | 'onDisconnect'
    | 'stopping'
    | 'stopped'
    | 'error';
  readonly isRunning: boolean;
  readonly mode: RuntimeMode;
  readonly activeBranch: string | null;
  readonly activeNodeId: string | null;
  readonly mainLoopIteration: number;
  readonly alarmLoopIteration: number;
  readonly lastError: string | null;
  /** @deprecated Tariff v3 (в v2 паузы нет). Удаляется в CT7. */
  readonly isPaused?: boolean;
  /** Чья команда `run` выполнялась последней (last-write-win, канон §3.2). */
  readonly authority?: RuntimeAuthority;
  /** @deprecated v1 legacy — заменён на `capture.mode` (board.capture). Удаляется в CT7. */
  readonly followerMode?: RuntimeFollowerMode | null;
}

/** Строка лога runtime (node → server → cabinet). */
export interface RuntimeLogPayload {
  readonly branch: string;
  readonly message: string;
  readonly ts: string;
}

export const NODE_REALTIME_EVENT_TYPES = {
  presence: {
    snapshot: 'presence.snapshot',
    heartbeat: 'presence.heartbeat',
    nodeOnline: 'node.online',
    nodeOffline: 'node.offline',
    sessionInvalidated: 'session.invalidated',
    /** PCB6: активная проба живости (server → node). */
    healthPing: 'health.ping',
    /** PCB6: ответ узла на пробу (node → server). */
    healthPong: 'health.pong',
    /** csp-2/G1: сервер шлёт узлу его тарифный контекст на коннекте (тариф → разрешённые UserCase-sku). */
    entitlements: 'node.entitlements',
  },
  journal: {
    append: 'journal.append',
    acked: 'journal.acked',
    liveSession: 'journal.liveSession',
  },
  micLive: {
    session: 'mic.session',
    analysisBrief: 'analysis.brief',
    analysisLevel: 'analysis.level',
  },
  runtime: {
    command: 'runtime.command',
    state: 'runtime.state',
    log: 'runtime.log',
  },
  board: {
    /** @deprecated Tariff v3 (edit lease вне тарифа v2). Удаляется в CT7. */
    editLease: 'board.edit-lease',
    /** @deprecated v1 legacy — заменён парой capture/release. Удаляется в CT7. */
    captureState: 'board.capture-state',
    /** v2: явный захват устройства кабинетом. */
    capture: 'board.capture',
    /** v2: продление TTL захвата (каждые 2 мин). */
    heartbeat: 'board.heartbeat',
    /** v2: отпускание захвата (НЕ стоп играющего сценария). */
    release: 'board.release',
    /**
     * CX3: узел объявляет список своих сценариев + выбранный (node → server →
     * cabinet). Сценарии пользовательские и живут на устройстве — сервер хранит
     * только объявленный список и выбранный id (решение владельца 2026-07-02).
     */
    scenarioList: 'board.scenario-list',
  },
} as const;

export type NodeRealtimeEnvelopeInput = NodeRealtimeEnvelope<unknown>;

// ===== from packages/core/src/contracts/node-realtime/parse.ts =====

const MP7_CHANNELS: ReadonlySet<NodeRealtimeChannel> = new Set([
  'journal',
  'mic-live',
  'presence',
  'runtime',
  'board',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Парсит и валидирует входящий JSON как NodeRealtimeEnvelope. */
export function parseNodeRealtimeEnvelope(
  raw: unknown,
): { ok: true; value: NodeRealtimeEnvelope } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: 'Envelope must be an object' };
  }

  if (raw.v !== NODE_REALTIME_PROTOCOL_V) {
    return { ok: false, error: `Unsupported protocol version: ${String(raw.v)}` };
  }

  const channel = raw.channel;
  if (typeof channel !== 'string' || !MP7_CHANNELS.has(channel as NodeRealtimeChannel)) {
    return { ok: false, error: 'Invalid or missing channel' };
  }

  const type = raw.type;
  if (typeof type !== 'string' || type.trim().length === 0) {
    return { ok: false, error: 'Invalid or missing type' };
  }

  const ts = raw.ts;
  if (typeof ts !== 'string' || Number.isNaN(Date.parse(ts))) {
    return { ok: false, error: 'Invalid or missing ts (ISO 8601)' };
  }

  return {
    ok: true,
    value: {
      v: NODE_REALTIME_PROTOCOL_V,
      channel: channel as NodeRealtimeChannel,
      type: type.trim(),
      ts,
      payload: raw.payload,
    },
  };
}

/** Собирает исходящий envelope MP7. */
export function createNodeRealtimeEnvelope<TPayload>(
  channel: NodeRealtimeChannel,
  type: string,
  payload: TPayload,
  ts: string = new Date().toISOString(),
): NodeRealtimeEnvelope<TPayload> {
  return {
    v: NODE_REALTIME_PROTOCOL_V,
    channel,
    type,
    ts,
    payload,
  };
}

// ===== from packages/core/src/contracts/node-realtime/validate-payloads.ts =====

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

/** Валидирует health.pong payload (node → server). */
export function parseHealthPongPayload(raw: unknown): HealthPongPayload | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.pingId)) {
    return null;
  }
  return { pingId: raw.pingId };
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

const SCENARIO_ENTITLEMENTS = ['bundled', 'community', 'entitled', 'locked'] as const;

function isScenarioEntitlement(value: unknown): value is BoardScenarioListItem['entitlement'] {
  return (
    typeof value === 'string' &&
    (SCENARIO_ENTITLEMENTS as readonly string[]).includes(value)
  );
}

/** Счётчик карточки (branch/function): целое ≥ 0. */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseScenarioListItem(raw: unknown): BoardScenarioListItem | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.id) || !isNonEmptyString(raw.title)) {
    return null;
  }
  // csp-1: базовые id/title + опциональные карточные поля (additive, backward-compat:
  // поле включается только при валидном значении; отсутствие kind = 'user').
  return {
    id: raw.id,
    title: raw.title,
    ...(raw.kind === 'system' || raw.kind === 'user' ? { kind: raw.kind } : {}),
    ...(isNonEmptyString(raw.description) ? { description: raw.description } : {}),
    ...(isScenarioEntitlement(raw.entitlement) ? { entitlement: raw.entitlement } : {}),
    ...(isCount(raw.branchCount) ? { branchCount: raw.branchCount } : {}),
    ...(isCount(raw.functionCount) ? { functionCount: raw.functionCount } : {}),
  };
}

/**
 * csp-2/G1: валидирует node.entitlements (server → node). tariffId непустой,
 * entitledTariffSkus — массив непустых строк (может быть пустым), дедуплицируется.
 */
export function parseNodeEntitlementsPayload(raw: unknown): NodeEntitlementsPayload | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.tariffId) || !Array.isArray(raw.entitledTariffSkus)) {
    return null;
  }
  const skus = new Set<string>();
  for (const sku of raw.entitledTariffSkus) {
    if (!isNonEmptyString(sku)) {
      return null;
    }
    skus.add(sku);
  }
  return { tariffId: raw.tariffId, entitledTariffSkus: [...skus] };
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
