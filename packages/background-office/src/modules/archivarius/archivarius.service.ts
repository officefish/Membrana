import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type {
  ArchivariusAuditReport,
  ArchivariusSearchQuery,
  ArchivariusSessionPassport,
  ArchivariusSpan,
  ArchivariusStore,
} from './archivarius.types';

export const ARCHIVARIUS_STORE = Symbol('ARCHIVARIUS_STORE');

function spanAddress(span: Pick<ArchivariusSpan, 'sessionId' | 'uuid'>): string {
  return `span://${span.sessionId}/${span.uuid}`;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

@Injectable()
export class ArchivariusService {
  constructor(@Inject(ARCHIVARIUS_STORE) private readonly store: ArchivariusStore) {}

  async ingest(spans: ArchivariusSpan[]): Promise<{ accepted: number; maskedLines: number }> {
    return this.store.upsertSpans(spans);
  }

  async getSpan(sessionId: string, uuid: string): Promise<{ bytes: string; sha256: string }> {
    const span = await this.store.getSpan(sessionId, uuid);
    if (!span) throw new NotFoundException({ code: 'ARCHIVARIUS_SPAN_NOT_FOUND', ref: `span://${sessionId}/${uuid}` });
    return { bytes: span.bytes, sha256: span.sha256 };
  }

  async audit(): Promise<ArchivariusAuditReport> {
    const spans = await this.store.listSpans();
    const findings: ArchivariusAuditReport['findings'] = [];
    const seen = new Set<string>();
    for (const span of spans) {
      const address = spanAddress(span);
      if (!span.sessionId) findings.push({ severity: 'error', code: 'missing-sessionId', address });
      if (!span.uuid) findings.push({ severity: 'error', code: 'missing-uuid', address });
      if (!span.ts) findings.push({ severity: 'error', code: 'missing-ts', address });
      if (sha256(span.bytes) !== span.sha256) findings.push({ severity: 'error', code: 'sha256-mismatch', address });
      if (seen.has(address)) findings.push({ severity: 'error', code: 'duplicate-address', address });
      seen.add(address);
    }
    return {
      spans: spans.length,
      sessions: new Set(spans.map((span) => span.sessionId)).size,
      maskedLines: spans.filter((span) => span.masked).length,
      findings,
      ok: findings.filter((finding) => finding.severity === 'error').length === 0,
    };
  }

  async decompose(by: 'sessions' | 'days' | 'actors' = 'sessions'): Promise<Array<{ key: string; spans: number; sessions: number; maskedLines: number }>> {
    const spans = await this.store.listSpans();
    const groups = new Map<string, { key: string; spans: number; sessions: Set<string>; maskedLines: number }>();
    const keyFor = (span: ArchivariusSpan) => {
      if (by === 'days') return span.ts.slice(0, 10) || 'unknown-day';
      if (by === 'actors') return span.actor || 'unknown';
      return span.sessionId || 'unknown-session';
    };
    for (const span of spans) {
      const key = keyFor(span);
      const row = groups.get(key) ?? { key, spans: 0, sessions: new Set<string>(), maskedLines: 0 };
      row.spans += 1;
      row.sessions.add(span.sessionId);
      if (span.masked) row.maskedLines += 1;
      groups.set(key, row);
    }
    return [...groups.values()]
      .map((row) => ({ key: row.key, spans: row.spans, sessions: row.sessions.size, maskedLines: row.maskedLines }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  async inspectElement(sessionId: string): Promise<ArchivariusSessionPassport> {
    const spans = (await this.store.listSpans())
      .filter((span) => span.sessionId === sessionId)
      .sort((a, b) => a.ts.localeCompare(b.ts));
    if (spans.length === 0) throw new NotFoundException({ code: 'ARCHIVARIUS_SESSION_NOT_FOUND', sessionId });
    return {
      sessionId,
      spans: spans.length,
      firstTs: spans[0]?.ts ?? null,
      lastTs: spans.at(-1)?.ts ?? null,
      actors: [...new Set(spans.map((span) => span.actor))].sort(),
      replyTypes: [...new Set(spans.map((span) => span.replyType))].sort(),
      maskedLines: spans.filter((span) => span.masked).length,
      sourcePaths: [...new Set(spans.map((span) => span.sourcePath).filter((p): p is string => Boolean(p)))].sort(),
    };
  }

  async search(query: ArchivariusSearchQuery): Promise<ArchivariusSpan[]> {
    const text = query.text?.toLowerCase();
    const actor = query.actor?.toLowerCase();
    const replyType = query.replyType?.toLowerCase();
    const from = query.from ? Date.parse(query.from) : null;
    const to = query.to ? Date.parse(query.to) : null;
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
    return (await this.store.listSpans()).filter((span) => {
      if (text && !span.bytes.toLowerCase().includes(text)) return false;
      if (actor && span.actor.toLowerCase() !== actor) return false;
      if (replyType && span.replyType.toLowerCase() !== replyType) return false;
      const t = Date.parse(span.ts);
      if (from != null && Number.isFinite(t) && t < from) return false;
      if (to != null && Number.isFinite(t) && t > to) return false;
      return true;
    }).slice(0, limit);
  }
}
