import { describe, expect, it } from 'vitest';

import { MemoryArchivariusStore } from './archivarius.memory-store';
import {
  ArchivariusService,
  compareSpanOrder,
  decodeSpanCursor,
  encodeSpanCursor,
  type ArchivariusQueryableStore,
  type ArchivariusSearchPage,
} from './archivarius.service';
import type { ArchivariusSpan } from './archivarius.types';

function span(over: Partial<ArchivariusSpan>): ArchivariusSpan {
  return {
    sessionId: 's1',
    uuid: 'u1',
    ts: '2026-07-27T10:00:00.000Z',
    actor: 'owner',
    replyType: 'input',
    bytes: 'hello',
    sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    masked: false,
    ...over,
  };
}

describe('ArchivariusService', () => {
  it('returns GET span extraction with bytes and sha256', async () => {
    const store = new MemoryArchivariusStore();
    const service = new ArchivariusService(store);
    await service.ingest([span({})]);

    await expect(service.getSpan('s1', 'u1')).resolves.toEqual({
      bytes: 'hello',
      sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    });
    await expect(service.audit()).resolves.toMatchObject({ ok: true, spans: 1, sessions: 1 });
    await expect(service.inspectElement('s1')).resolves.toMatchObject({ sessionId: 's1', actors: ['owner'] });
  });

  it('search отдаёт страницу меты без bytes (fallback memory: substring-семантика)', async () => {
    const store = new MemoryArchivariusStore();
    const service = new ArchivariusService(store);
    await service.ingest([span({})]);

    const page = await service.search({ actor: 'owner', text: 'hell' });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
    expect(page.items[0]).toMatchObject({ address: 'span://s1/u1', sessionId: 's1', uuid: 'u1', masked: false });
    expect(page.items[0]).not.toHaveProperty('bytes');
  });

  it('курсор листает страницы устойчиво при РАВНЫХ ts (инвариант трёхпольного порядка)', async () => {
    const store = new MemoryArchivariusStore();
    const service = new ArchivariusService(store);
    const ts = '2026-07-27T10:00:00.000Z';
    await service.ingest([
      span({ uuid: 'u3', ts }),
      span({ uuid: 'u1', ts }),
      span({ uuid: 'u2', ts }),
    ]);

    const page1 = await service.search({ limit: 2 });
    expect(page1.items.map((m) => m.uuid)).toEqual(['u1', 'u2']);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await service.search({ limit: 2, cursor: page1.nextCursor! });
    expect(page2.items.map((m) => m.uuid)).toEqual(['u3']);
    expect(page2.nextCursor).toBeNull();
  });

  it('кодек курсора обратим; мусорный курсор читается как null, а не как пустая страница молча', () => {
    const c = encodeSpanCursor({ ts: 't', sessionId: 's', uuid: 'u' });
    expect(decodeSpanCursor(c)).toEqual({ ts: 't', sessionId: 's', uuid: 'u' });
    expect(decodeSpanCursor('мусор')).toBeNull();
    expect(compareSpanOrder({ ts: 'a', sessionId: 'b', uuid: 'c' }, { ts: 'a', sessionId: 'b', uuid: 'c' })).toBe(0);
  });

  it('capability-store: service делегирует searchSpans/decomposeSpans/passport/audit-агрегатам', async () => {
    const calls: string[] = [];
    const page: ArchivariusSearchPage = { items: [], nextCursor: null };
    const store: ArchivariusQueryableStore = {
      async upsertSpans(spans) {
        return { accepted: spans.length, maskedLines: 0 };
      },
      async getSpan() {
        return null;
      },
      async listSpans() {
        throw new Error('listSpans звать нельзя: capability-store судится запросами, не вычиткой');
      },
      async searchSpans(q) {
        calls.push(`search:${q.limit}:${q.cursor ?? '-'}`);
        return page;
      },
      async decomposeSpans(by) {
        calls.push(`decompose:${by}`);
        return [];
      },
      async sessionPassport(sessionId) {
        calls.push(`passport:${sessionId}`);
        return {
          sessionId,
          spans: 2,
          firstTs: 'a',
          lastTs: 'b',
          actors: [],
          replyTypes: [],
          maskedLines: 0,
          sourcePaths: [],
        };
      },
      async auditTotals() {
        calls.push('totals');
        return { spans: 2, sessions: 1, maskedLines: 1 };
      },
      async auditDuplicates() {
        calls.push('dups');
        return ['span://s1/u1'];
      },
      async iterateIntegrity(onBatch) {
        calls.push('integrity');
        onBatch([
          {
            sessionId: 's1',
            uuid: 'u1',
            ts: 't',
            bytes: 'hello',
            sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
          },
        ]);
      },
    };
    const service = new ArchivariusService(store);

    await expect(service.search({ limit: 7, cursor: 'c0' })).resolves.toBe(page);
    await expect(service.decompose('days')).resolves.toEqual([]);
    await expect(service.inspectElement('sX')).resolves.toMatchObject({ sessionId: 'sX', spans: 2 });
    const audit = await service.audit();
    expect(audit).toMatchObject({ spans: 2, sessions: 1, maskedLines: 1, ok: false });
    expect(audit.findings).toEqual([{ severity: 'error', code: 'duplicate-address', address: 'span://s1/u1' }]);
    expect(calls).toEqual(['search:7:c0', 'decompose:days', 'passport:sX', 'integrity', 'dups', 'totals']);
  });

  it('audit ловит sha256-mismatch и на батчевом пути', async () => {
    const store: ArchivariusQueryableStore = {
      async upsertSpans() {
        return { accepted: 0, maskedLines: 0 };
      },
      async getSpan() {
        return null;
      },
      async listSpans() {
        return [];
      },
      async auditTotals() {
        return { spans: 1, sessions: 1, maskedLines: 0 };
      },
      async auditDuplicates() {
        return [];
      },
      async iterateIntegrity(onBatch) {
        onBatch([{ sessionId: 's1', uuid: 'u1', ts: 't', bytes: 'tampered', sha256: 'a'.repeat(64) }]);
      },
      async searchSpans() {
        return { items: [], nextCursor: null };
      },
    };
    const service = new ArchivariusService(store);
    const audit = await service.audit();
    expect(audit.ok).toBe(false);
    expect(audit.findings).toEqual([{ severity: 'error', code: 'sha256-mismatch', address: 'span://s1/u1' }]);
  });
});
