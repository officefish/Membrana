import type { PluginId } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { describe, expect, it } from 'vitest';

import { MemoryPluginResultsStore } from './plugin-results.memory-store';
import { PluginResultsService, type PluginContracts } from './plugin-results.service';
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
    fingerprints: { inputHash: 'old', configHash: 'cfg' },
    resumeMode: 'fresh',
    ...over,
  };
}

function state(over: Partial<StateRecord> = {}): StateRecord {
  return {
    pluginId: 'membrana.handler.mfcc' as PluginId,
    version: '1.0.0',
    collectionId: 'c1',
    kind: 'state',
    frozenAt: new Date('2026-08-18T06:00:00.000Z'),
    windowStart: 0,
    windowEnd: 1,
    payload: { current: true },
    ...over,
  };
}

describe('PluginResultsService', () => {
  it('writes runs and computes stale on read instead of storing it', async () => {
    const store = new MemoryPluginResultsStore();
    const service = new PluginResultsService(store);
    await service.writeRun(run());
    const rows = await service.readRuns({ collectionId: 'c1', currentInputHash: 'new' });
    expect(rows).toEqual([{ ...run(), stale: true }]);
    const stored = [...(store as unknown as { runs: Map<string, unknown> }).runs.values()][0];
    expect(stored).not.toHaveProperty('stale');
  });

  it('rejects PluginId values that fail the contracts validator shape', async () => {
    const service = new PluginResultsService(new MemoryPluginResultsStore());
    const badRun = run({ address: { ...run().address, pluginId: 'membrana' as PluginId } });
    await expect(service.writeRun(badRun, state({ pluginId: 'membrana' as PluginId }))).rejects.toThrow(
      'Invalid plugin id',
    );
  });
});

describe('PluginResultsService — обещание импорта контрактов живёт в экземпляре (#1972)', () => {
  class FlakyService extends PluginResultsService {
    attempts = 0;
    constructor(store: MemoryPluginResultsStore, private readonly failFirst: boolean) {
      super(store);
    }
    protected override loadContracts(): Promise<PluginContracts> {
      this.attempts += 1;
      if (this.failFirst && this.attempts === 1) return Promise.reject(new Error('import упал'));
      return Promise.resolve({ isPluginId: (v) => typeof v === 'string' && v.includes('.') });
    }
  }

  it('ошибка импорта у одного экземпляра не залипает у другого и не залипает у него самого', async () => {
    const flaky = new FlakyService(new MemoryPluginResultsStore(), true);
    const healthy = new FlakyService(new MemoryPluginResultsStore(), false);
    await expect(flaky.writeRun(run())).rejects.toThrow('import упал');
    await expect(healthy.writeRun(run())).resolves.toBeUndefined();
    await expect(flaky.writeRun(run())).resolves.toBeUndefined();
    expect(flaky.attempts).toBe(2);
  });
});
