import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { MongoPluginResultsStore } from './plugin-results.mongo-store';
import type { RunRecord, StateRecord } from './plugin-results.types';

function run(over: Partial<RunRecord> = {}): RunRecord {
  return {
    pluginId: 'scope/plugin',
    version: '1.0.0',
    collectionId: 'c1',
    runId: 'r1',
    kind: 'state',
    completedAt: '2026-08-18T06:00:00.000Z',
    inputHash: 'h1',
    payload: { ok: true },
    ...over,
  };
}

class FakeMongoStore extends MongoPluginResultsStore {
  constructor(config: AppConfig, private readonly fakeCollection: Record<string, unknown>) {
    super(config);
  }

  protected override async connect() {
    return {
      db: () => ({ collection: () => this.fakeCollection }),
      close: async () => undefined,
    } as never;
  }
}

describe('MongoPluginResultsStore', () => {
  it('requires ARCHIVARIUS_MONGO_URI when Mongo store is selected', async () => {
    const store = new MongoPluginResultsStore({} as AppConfig);
    await expect(store.readRuns({ collectionId: 'c1' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('creates plugin-results indexes and upserts run with nested StateRecord', async () => {
    const indexes: unknown[] = [];
    const updates: unknown[] = [];
    const finds: unknown[] = [];
    const fake = {
      createIndex: async (keys: unknown, options?: unknown) => indexes.push({ keys, options }),
      updateOne: async (filter: unknown, update: unknown, options: unknown) => updates.push({ filter, update, options }),
      find: (filter: unknown, options: unknown) => {
        finds.push({ filter, options });
        return { toArray: async () => [run()] };
      },
    };
    const store = new FakeMongoStore({ ARCHIVARIUS_MONGO_URI: 'mongodb://fake' } as AppConfig, fake);

    await store.writeRun(run(), { ...run(), state: { current: true } } as StateRecord);
    await expect(store.readRuns({ collectionId: 'c1', kind: 'state', limit: 5 })).resolves.toEqual([run()]);

    expect(indexes).toEqual([
      { keys: { pluginId: 1, version: 1, collectionId: 1, runId: 1 }, options: { unique: true } },
      { keys: { pluginId: 1, version: 1, collectionId: 1, kind: 1, completedAt: -1 }, options: undefined },
    ]);
    expect(updates[0]).toMatchObject({
      filter: { pluginId: 'scope/plugin', version: '1.0.0', collectionId: 'c1', runId: 'r1' },
      options: { upsert: true },
    });
    expect(JSON.stringify(updates[0])).toContain('stateRecord');
    expect(finds[0]).toMatchObject({
      filter: { collectionId: 'c1', kind: 'state' },
      options: { projection: { _id: 0, stateRecord: 0 }, sort: { completedAt: -1 }, limit: 5 },
    });
  });
});
