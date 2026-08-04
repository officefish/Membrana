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

/**
 * Sync-point нарезки archivarius-live-wiring (правка резчика №1, 04.08): контракт
 * страницы поиска фиксируется ЗДЕСЬ до первого прогона тракта. Клиенты (CLI-тракт)
 * потребляют мету+курсор; полные bytes отдаёт только span-маршрут
 * GET /v1/archivarius/span/:sessionId/:uuid — search перестал выносить до 500 полных
 * транскриптов за запрос (обзор 04.08, П5).
 */
export interface ArchivariusSpanMeta {
  address: string;
  sessionId: string;
  uuid: string;
  ts: string;
  actor: string;
  replyType: string;
  sha256: string;
  masked: boolean;
}

export interface ArchivariusSearchPage {
  items: ArchivariusSpanMeta[];
  nextCursor: string | null;
}

export interface ArchivariusPagedSearchQuery extends ArchivariusSearchQuery {
  cursor?: string | null;
}

/**
 * Capability-расширение store (контракт объявлен у сервиса — носителя ARCHIVARIUS_STORE;
 * types.ts вне зоны блока mongo-native-queries, и это названо, а не спрятано).
 * Методы опциональны: Mongo-store реализует запросами по индексам, memory-store живёт
 * законным JS-fallback'ом сервиса (так велит нарезка, //block-1).
 */
export interface ArchivariusQueryableStore extends ArchivariusStore {
  searchSpans?(query: ArchivariusPagedSearchQuery & { limit: number }): Promise<ArchivariusSearchPage>;
  decomposeSpans?(by: 'sessions' | 'days' | 'actors'): Promise<Array<{ key: string; spans: number; sessions: number; maskedLines: number }>>;
  sessionPassport?(sessionId: string): Promise<ArchivariusSessionPassport | null>;
  auditTotals?(): Promise<{ spans: number; sessions: number; maskedLines: number }>;
  /** Адреса span://…, встречающиеся более одного раза (агрегация, приговор Дынина: дубликаты — не работа курсорного обхода). */
  auditDuplicates?(): Promise<string[]>;
  /** Батчевый обход целостности: bytes+sha256 порциями, не полной вычиткой в один массив. */
  iterateIntegrity?(
    onBatch: (batch: Array<Pick<ArchivariusSpan, 'sessionId' | 'uuid' | 'ts' | 'bytes' | 'sha256'>>) => void,
    batchSize?: number,
  ): Promise<void>;
}

function spanAddress(span: Pick<ArchivariusSpan, 'sessionId' | 'uuid'>): string {
  return `span://${span.sessionId}/${span.uuid}`;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function spanMetaOf(span: ArchivariusSpan): ArchivariusSpanMeta {
  return {
    address: spanAddress(span),
    sessionId: span.sessionId,
    uuid: span.uuid,
    ts: span.ts,
    actor: span.actor,
    replyType: span.replyType,
    sha256: span.sha256,
    masked: span.masked,
  };
}

/**
 * Курсор страницы — base64(JSON [ts, sessionId, uuid]) последней записи. Инвариант
 * Дынина: курсор держится только на ПОЛНОЙ трёхпольной сортировке {ts, sessionId, uuid}
 * (равные ts — норма журнальных данных); Mongo-store заводит под неё составной индекс.
 */
export function encodeSpanCursor(meta: Pick<ArchivariusSpanMeta, 'ts' | 'sessionId' | 'uuid'>): string {
  return Buffer.from(JSON.stringify([meta.ts, meta.sessionId, meta.uuid]), 'utf8').toString('base64url');
}

export function decodeSpanCursor(cursor: string): { ts: string; sessionId: string; uuid: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!Array.isArray(parsed) || parsed.length !== 3 || parsed.some((v) => typeof v !== 'string')) return null;
    return { ts: parsed[0], sessionId: parsed[1], uuid: parsed[2] };
  } catch {
    return null;
  }
}

export function compareSpanOrder(
  a: Pick<ArchivariusSpanMeta, 'ts' | 'sessionId' | 'uuid'>,
  b: Pick<ArchivariusSpanMeta, 'ts' | 'sessionId' | 'uuid'>,
): number {
  return a.ts.localeCompare(b.ts) || a.sessionId.localeCompare(b.sessionId) || a.uuid.localeCompare(b.uuid);
}

@Injectable()
export class ArchivariusService {
  constructor(@Inject(ARCHIVARIUS_STORE) private readonly store: ArchivariusQueryableStore) {}

  async ingest(spans: ArchivariusSpan[]): Promise<{ accepted: number; maskedLines: number }> {
    return this.store.upsertSpans(spans);
  }

  async getSpan(sessionId: string, uuid: string): Promise<{ bytes: string; sha256: string }> {
    const span = await this.store.getSpan(sessionId, uuid);
    if (!span) throw new NotFoundException({ code: 'ARCHIVARIUS_SPAN_NOT_FOUND', ref: `span://${sessionId}/${uuid}` });
    return { bytes: span.bytes, sha256: span.sha256 };
  }

  async audit(): Promise<ArchivariusAuditReport> {
    if (this.store.auditTotals && this.store.iterateIntegrity && this.store.auditDuplicates) {
      const findings: ArchivariusAuditReport['findings'] = [];
      await this.store.iterateIntegrity((batch) => {
        for (const span of batch) {
          const address = spanAddress(span);
          if (!span.sessionId) findings.push({ severity: 'error', code: 'missing-sessionId', address });
          if (!span.uuid) findings.push({ severity: 'error', code: 'missing-uuid', address });
          if (!span.ts) findings.push({ severity: 'error', code: 'missing-ts', address });
          if (sha256(span.bytes) !== span.sha256) findings.push({ severity: 'error', code: 'sha256-mismatch', address });
        }
      });
      for (const address of await this.store.auditDuplicates()) {
        findings.push({ severity: 'error', code: 'duplicate-address', address });
      }
      const totals = await this.store.auditTotals();
      return { ...totals, findings, ok: findings.filter((f) => f.severity === 'error').length === 0 };
    }
    // Fallback memory-store: корпус в памяти и так — полная вычитка честна.
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
    if (this.store.decomposeSpans) return this.store.decomposeSpans(by);
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
    if (this.store.sessionPassport) {
      const passport = await this.store.sessionPassport(sessionId);
      if (!passport) throw new NotFoundException({ code: 'ARCHIVARIUS_SESSION_NOT_FOUND', sessionId });
      return passport;
    }
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

  /**
   * Страница меты (контракт ArchivariusSearchPage). Семантика text-фильтра различается
   * по носителю и НАЗВАНА: Mongo — $text по индексу bytes:'text' (слова со стеммингом,
   * БЕЗ substring и БЕЗ префиксов); memory-fallback — substring includes. Различие —
   * цена индекса, зафиксировано контекстом Дынина 04.08.
   */
  async search(query: ArchivariusPagedSearchQuery): Promise<ArchivariusSearchPage> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
    if (this.store.searchSpans) return this.store.searchSpans({ ...query, limit });

    const text = query.text?.toLowerCase();
    const actor = query.actor?.toLowerCase();
    const replyType = query.replyType?.toLowerCase();
    const from = query.from ? Date.parse(query.from) : null;
    const to = query.to ? Date.parse(query.to) : null;
    const after = query.cursor ? decodeSpanCursor(query.cursor) : null;
    const matched = (await this.store.listSpans())
      .filter((span) => {
        if (text && !span.bytes.toLowerCase().includes(text)) return false;
        if (actor && span.actor.toLowerCase() !== actor) return false;
        if (replyType && span.replyType.toLowerCase() !== replyType) return false;
        const t = Date.parse(span.ts);
        if (from != null && Number.isFinite(t) && t < from) return false;
        if (to != null && Number.isFinite(t) && t > to) return false;
        return true;
      })
      .map(spanMetaOf)
      .sort(compareSpanOrder)
      .filter((meta) => (after ? compareSpanOrder(meta, after) > 0 : true));
    const items = matched.slice(0, limit);
    const nextCursor = matched.length > limit && items.length > 0 ? encodeSpanCursor(items[items.length - 1]!) : null;
    return { items, nextCursor };
  }
}
