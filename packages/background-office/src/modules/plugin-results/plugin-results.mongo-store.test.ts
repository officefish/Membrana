import { ServiceUnavailableException } from '@nestjs/common';
import type { PluginId } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { MongoPluginResultsStore } from './plugin-results.mongo-store';
import type { RunRecord, StateRecord } from './plugin-results.types';

function run(over: Partial<RunRecord> = {}): RunRecord {
  return {
    address: {
      pluginId: 'membrana.handler.mfcc' as PluginId,
      version: '1.0.0',
      collectionId: 'c1',
      runId: 'r1',
      mountTarget: 'background-media/collections',
    },
    kind: 'handler',
    completedAt: new Date('2026-08-18T06:00:00.000Z'),
    fingerprints: { inputHash: 'h1', configHash: 'cfg' },
    resumeMode: 'fresh',
    ...over,
  };
}

function state(): StateRecord {
  return {
    pluginId: 'membrana.handler.mfcc' as PluginId,
    version: '1.0.0',
    collectionId: 'c1',
    kind: 'state',
    frozenAt: new Date('2026-08-18T06:00:00.000Z'),
    windowStart: 0,
    windowEnd: 1,
    payload: { current: true },
  };
}

function document(): RunRecord & {
  pluginId: PluginId;
  version: string;
  collectionId: string;
  runId: string;
  mountTarget: RunRecord['address']['mountTarget'];
  stateRecord: StateRecord;
} {
  const record = run();
  return { ...record, ...record.address, stateRecord: state() };
}

class FakeMongoStore extends MongoPluginResultsStore {
  connects = 0;

  constructor(config: AppConfig, private readonly fakeCollection: Record<string, unknown>) {
    super(config);
  }

  protected override async connect(_uri: string) {
    this.connects += 1;
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
        return { toArray: async () => [document()] };
      },
    };
    const store = new FakeMongoStore({ ARCHIVARIUS_MONGO_URI: 'mongodb://fake' } as AppConfig, fake);

    await store.writeRun(run(), state());
    await expect(store.readRuns({ collectionId: 'c1', kind: 'handler', limit: 5 })).resolves.toEqual([run()]);
    await Promise.all([
      store.writeRun(run({ address: { ...run().address, runId: 'r2' } }), state()),
      store.readRuns({ collectionId: 'c1' }),
    ]);

    expect(indexes).toEqual([
      { keys: { pluginId: 1, version: 1, collectionId: 1, runId: 1 }, options: { unique: true } },
      { keys: { pluginId: 1, version: 1, collectionId: 1, kind: 1, completedAt: -1 }, options: undefined },
    ]);
    expect(updates[0]).toMatchObject({
      filter: { pluginId: 'membrana.handler.mfcc', version: '1.0.0', collectionId: 'c1', runId: 'r1' },
      options: { upsert: true },
    });
    expect(JSON.stringify(updates[0])).toContain('stateRecord');
    expect(JSON.stringify(updates[0])).toContain('background-media/collections');
    expect(finds[0]).toMatchObject({
      filter: { collectionId: 'c1', kind: 'handler' },
      options: {
        projection: { _id: 0, stateRecord: 0 },
        sort: { completedAt: -1 },
        limit: 5,
      },
    });
    expect(store.connects).toBe(1);
  });
});
