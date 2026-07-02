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

export interface SessionInvalidatedPayload {
  readonly reason: 'revoked' | 'expired' | 'session_expired';
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
 * `pause` / `resume` / `setMode` — Tariff v3: удаляются из wire в CT7.
 * `authority` / `followerMode` на `run` — deprecated (v1 неявный захват);
 * в v2 захват передаётся отдельным `board.capture`.
 */
export type RuntimeCommandPayload =
  | {
      readonly action: 'run';
      readonly deviceId?: string;
      /** v2: запуск конкретного существующего сценария (после selectScenario). */
      readonly scenarioId?: string;
      /** @deprecated Tariff v3 / v1 legacy — захват теперь явный (`board.capture`). Удаляется в CT7. */
      readonly authority?: RuntimeAuthority;
      /** @deprecated Tariff v3 / v1 legacy — заменён на `capture.mode`. Удаляется в CT7. */
      readonly followerMode?: RuntimeFollowerMode;
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
    }
  /** @deprecated Tariff v3: pause/resume/setMode удаляются из wire в CT7. */
  | { readonly action: 'pause'; readonly deviceId?: string }
  | { readonly action: 'resume'; readonly deviceId?: string }
  | { readonly action: 'setMode'; readonly mode: RuntimeMode; readonly deviceId?: string };

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
    nodeOnline: 'node.online',
    nodeOffline: 'node.offline',
    sessionInvalidated: 'session.invalidated',
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
  },
} as const;

export type NodeRealtimeEnvelopeInput = NodeRealtimeEnvelope<unknown>;
