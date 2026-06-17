import type { NodeRealtimeEnvelope } from './envelope.js';

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
} as const;

export type NodeRealtimeEnvelopeInput = NodeRealtimeEnvelope<unknown>;
