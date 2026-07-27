export interface ArchivariusSpanAddress {
  sessionId: string;
  uuid: string;
  ts: string;
}

export interface ArchivariusSpan extends ArchivariusSpanAddress {
  actor: string;
  replyType: string;
  bytes: string;
  sha256: string;
  masked: boolean;
  maskedCuts?: Array<{ name: string; line?: number; path?: string; length: number }>;
  sourcePath?: string | null;
  lineNo?: number | null;
}

export interface ArchivariusSearchQuery {
  text?: string;
  actor?: string;
  replyType?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ArchivariusAuditReport {
  spans: number;
  sessions: number;
  maskedLines: number;
  findings: Array<{ severity: 'error' | 'warn'; code: string; address?: string; detail?: string }>;
  ok: boolean;
}

export interface ArchivariusSessionPassport {
  sessionId: string;
  spans: number;
  firstTs: string | null;
  lastTs: string | null;
  actors: string[];
  replyTypes: string[];
  maskedLines: number;
  sourcePaths: string[];
}

export interface ArchivariusStore {
  upsertSpans(spans: ArchivariusSpan[]): Promise<{ accepted: number; maskedLines: number }>;
  getSpan(sessionId: string, uuid: string): Promise<ArchivariusSpan | null>;
  listSpans(): Promise<ArchivariusSpan[]>;
  close?(): Promise<void>;
}
