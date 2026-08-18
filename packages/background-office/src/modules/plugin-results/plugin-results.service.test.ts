import { describe, expect, it } from 'vitest';

import { MemoryPluginResultsStore } from './plugin-results.memory-store';
import { PLUGIN_RESULTS_STORE, PluginResultsService } from './plugin-results.service';
import type { RunRecord, StateRecord } from './plugin-results.types';

function run(over: Partial<RunRecord> = {}): RunRecord {
  return {
    pluginId: 'scope/plugin',
    version: '1.0.0',
    collectionId: 'c1',
    runId: 'r1',
    kind: 'state',
    completedAt: '2026-08-18T06:00:00.000Z',
    inputHash: 'old',
    payload: { ok: true },
    ...over,
  };
}

function state(over: Partial<StateRecord> = {}): StateRecord {
  return { ...run(), state: { current: true }, ...over };
}

describe('PluginResultsService', () => {
  it('writes runs and computes stale on read instead of storing it', async () => {
    const store = new MemoryPluginResultsStore();
    const service = new PluginResultsService(store);
    await service.writeRun(run(), state());
    const rows = await service.readRuns({ collectionId: 'c1', currentInputHash: 'new' });
    expect(rows).toEqual([{ ...run(), stale: true }]);
    const stored = [...(store as unknown as { runs: Map<string, unknown> }).runs.values()][0];
    expect(stored).not.toHaveProperty('stale');
  });

  it('exports an injectable store token for the module boundary', () => {
    expect(typeof PLUGIN_RESULTS_STORE).toBe('symbol');
  });
});
