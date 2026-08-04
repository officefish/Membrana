import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { MongoArchivariusStore } from './archivarius.mongo-store';
import type { ArchivariusSpan } from './archivarius.types';

/**
 * Контрактные unit-зубы store БЕЗ живой Mongo (спринт archivarius-live-wiring, блок 3;
 * по правке резчика — только контракт, smoke это НЕ заменяет).
 *
 * Подстановка фейковой коллекции идёт в ПРИВАТНОЕ поле `collection` — это названный
 * обход инициализации spans() (живого клиента), а не инъекция: приватное поле — деталь
 * реализации, проверяются публичные методы (вердикт Ожегова 04.08). Если store когда-то
 * получит конструкторную инъекцию — переписывается этот тест, не store.
 */

type FindCall = { filter: Record<string, unknown>; options: Record<string, unknown> };

function span(over: Partial<ArchivariusSpan>): ArchivariusSpan {
  return {
    sessionId: 's1',
    uuid: 'u1',
    ts: '2026-08-04T10:00:00.000Z',
    actor: 'owner',
    replyType: 'input',
    bytes: 'hello',
    sha256: 'f'.repeat(64),
    masked: false,
    ...over,
  };
}

function storeWithFakeCollection(fake: Record<string, unknown>): MongoArchivariusStore {
  const store = new MongoArchivariusStore({ ARCHIVARIUS_MONGO_URI: 'mongodb://fake' } as AppConfig);
  (store as unknown as { collection: unknown }).collection = fake;
  return store;
}

describe('MongoArchivariusStore (контракт, фейковая коллекция)', () => {
  it('без ARCHIVARIUS_MONGO_URI любой глагол отвечает 503, а не молчаливой пустотой', async () => {
    const store = new MongoArchivariusStore({} as AppConfig);
    await expect(store.getSpan('s', 'u')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(store.upsertSpans([span({})])).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(store.searchSpans({ limit: 1 })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('upsertSpans строит bulkWrite-упсерты по {sessionId, uuid} с ordered:false; пустой вход — ноль вызовов', async () => {
    const calls: Array<{ ops: unknown[]; options: Record<string, unknown> }> = [];
    const store = storeWithFakeCollection({
      bulkWrite: async (ops: unknown[], options: Record<string, unknown>) => void calls.push({ ops, options }),
    });

    await expect(store.upsertSpans([])).resolves.toEqual({ accepted: 0, maskedLines: 0 });
    expect(calls).toHaveLength(0);

    const result = await store.upsertSpans([span({}), span({ uuid: 'u2', masked: true })]);
    expect(result).toEqual({ accepted: 2, maskedLines: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.options).toEqual({ ordered: false });
    const first = calls[0]!.ops[0] as { updateOne: { filter: unknown; upsert?: boolean } & Record<string, unknown> };
    expect(first.updateOne.filter).toEqual({ sessionId: 's1', uuid: 'u1' });
    expect((first.updateOne as { upsert: boolean }).upsert).toBe(true);
  });

  it('searchSpans: $text только при text; курсор — $or трёх диапазонных клаузул; limit+1; items без bytes', async () => {
    const finds: FindCall[] = [];
    const rows = [
      span({ uuid: 'u1' }),
      span({ uuid: 'u2' }),
      span({ uuid: 'u3' }),
    ].map(({ bytes: _bytes, ...meta }) => meta);
    const store = storeWithFakeCollection({
      find: (filter: Record<string, unknown>, options: Record<string, unknown>) => {
        finds.push({ filter, options });
        return { toArray: async () => rows };
      },
    });

    const page = await store.searchSpans({ limit: 2, text: 'дрон', cursor: null });
    expect(finds).toHaveLength(1);
    const { filter, options } = finds[0]!;
    const clauses = (filter.$and ?? []) as Array<Record<string, unknown>>;
    expect(clauses.some((c) => '$text' in c)).toBe(true);
    expect(options.limit).toBe(3);
    expect(options.sort).toEqual({ ts: 1, sessionId: 1, uuid: 1 });
    expect((options.projection as Record<string, number>).bytes).toBe(0);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).not.toBeNull();
    expect(page.items[0]).not.toHaveProperty('bytes');

    finds.length = 0;
    await store.searchSpans({ limit: 5, cursor: page.nextCursor });
    const cursorClauses = ((finds[0]!.filter.$and ?? []) as Array<Record<string, unknown>>).find((c) => '$or' in c);
    expect(cursorClauses).toBeDefined();
    expect((cursorClauses!.$or as unknown[]).length).toBe(3);
  });

  it('decomposeSpans маппит агрегатные строки: key/spans/размер множества сессий', async () => {
    const pipelines: unknown[] = [];
    const store = storeWithFakeCollection({
      aggregate: (pipeline: unknown) => {
        pipelines.push(pipeline);
        return { toArray: async () => [{ _id: '2026-08-04', spans: 2, sessions: ['s1', 's2'], maskedLines: 1 }] };
      },
    });
    const rows = await store.decomposeSpans('days');
    expect(rows).toEqual([{ key: '2026-08-04', spans: 2, sessions: 2, maskedLines: 1 }]);
    expect(JSON.stringify(pipelines[0])).toContain('$group');
  });

  it('auditDuplicates отдаёт адреса span://…, не сырые _id', async () => {
    const store = storeWithFakeCollection({
      aggregate: () => ({ toArray: async () => [{ _id: { sessionId: 's1', uuid: 'u9' }, count: 2 }] }),
    });
    await expect(store.auditDuplicates()).resolves.toEqual(['span://s1/u9']);
  });

  it('iterateIntegrity продвигается по тройке, останавливается на неполном батче и не зацикливается на ломаном порядке', async () => {
    const finds: FindCall[] = [];
    const batches = [
      [span({ uuid: 'u1' }), span({ uuid: 'u2' })],
      [span({ uuid: 'u3' })],
    ];
    let call = 0;
    const store = storeWithFakeCollection({
      find: (filter: Record<string, unknown>, options: Record<string, unknown>) => {
        finds.push({ filter, options });
        return { toArray: async () => batches[call++] ?? [] };
      },
    });
    const seen: string[] = [];
    await store.iterateIntegrity((batch) => void seen.push(...batch.map((s) => s.uuid)), 2);
    expect(seen).toEqual(['u1', 'u2', 'u3']);
    expect(finds).toHaveLength(2);
    expect(finds[0]!.filter).toEqual({});
    expect('$or' in finds[1]!.filter).toBe(true);

    // Ломаный порядок: коллекция возвращает один и тот же полный батч — обход обязан
    // остановиться страховкой, а не крутиться вечно.
    let stuckCalls = 0;
    const stuck = storeWithFakeCollection({
      find: () => {
        stuckCalls += 1;
        return { toArray: async () => [span({ uuid: 'same' }), span({ uuid: 'same' })] };
      },
    });
    await stuck.iterateIntegrity(() => {}, 2);
    expect(stuckCalls).toBeLessThanOrEqual(3);
  });
});
