import type { NodeRealtimeEnvelope } from './envelope.js';
import type { RuntimeAuthority, RuntimeFollowerMode } from './board-events.js';

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
