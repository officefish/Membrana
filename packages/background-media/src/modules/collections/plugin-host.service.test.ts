import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CollectionsPluginHostService, type PluginContracts } from './plugin-host.service';
import type { HomeName, PluginContext, PluginExecutor, PluginId, PluginManifest } from './plugin-host.types';

const goodId = 'membrana.handler.mfcc' as PluginId;

function manifest(over: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: goodId,
    kind: 'handler',
    version: '1.0.0',
    mountTarget: 'background-media/collections',
    triggers: ['collections.sample_added'],
    windowSize: 64,
    ...over,
  };
}

function context(over: Partial<PluginContext> = {}): PluginContext {
  return {
    address: {
      pluginId: goodId,
      version: '1.0.0',
      collectionId: 'c1',
      runId: 'r1',
      mountTarget: 'background-media/collections',
    },
    fingerprints: { inputHash: 'input', configHash: 'config' },
    resumeMode: 'fresh',
    trigger: 'collections.sample_added',
    payload: { collectionId: 'c1', sampleId: 's1' },
    ...over,
  };
}

function executor(calls: PluginContext[]): PluginExecutor {
  return {
    execute: async (ctx) => {
      calls.push(ctx);
      return { kind: 'handler', completedAt: new Date('2026-08-18T08:00:00.000Z') };
    },
  };
}

async function readyHost(): Promise<CollectionsPluginHostService> {
  const host = new CollectionsPluginHostService();
  await host.onModuleInit();
  return host;
}

describe('CollectionsPluginHostService', () => {
  it('accepts canonical PluginId and rejects a legacy slug', async () => {
    const host = await readyHost();
    expect(() => host.registerPlugin(manifest(), executor([]))).not.toThrow();
    expect(() => host.registerPlugin(manifest({ id: 'mfcc-detector' as PluginId }), executor([]))).toThrow(
      BadRequestException,
    );
  });

  it('rejects unknown and foreign mount targets before runtime', async () => {
    const host = await readyHost();
    expect(() => host.registerPlugin(manifest({ mountTarget: 'samples' as HomeName }), executor([]))).toThrow(
      BadRequestException,
    );
    expect(() => host.registerPlugin(manifest({ mountTarget: 'background-office/journal' }), executor([]))).toThrow(
      BadRequestException,
    );
  });

  it('notify reaches enabled matching plugins and drops disabled signals', async () => {
    const calls: PluginContext[] = [];
    const host = await readyHost();
    host.registerPlugin(manifest(), executor(calls));
    host.notify({ trigger: 'collections.collection_created', occurredAt: new Date(), payload: context() });
    host.notify({ trigger: 'collections.sample_added', occurredAt: new Date(), payload: context() });
    host.setPluginEnabled(goodId, false);
    host.notify({ trigger: 'collections.sample_added', occurredAt: new Date(), payload: context() });
    await Promise.resolve();
    expect(calls).toEqual([context()]);
    expect(host.getRegisteredPlugins()).toEqual([manifest()]);
  });

  it('rejects malformed live contexts before execution', async () => {
    const calls: PluginContext[] = [];
    const host = await readyHost();
    host.registerPlugin(manifest(), executor(calls));
    expect(() => host.notify({ trigger: 'collections.sample_added', occurredAt: new Date(), payload: null })).toThrow(
      BadRequestException,
    );
    expect(calls).toEqual([]);
  });

  it('request runs exactly one enabled executor post factum', async () => {
    const callsA: PluginContext[] = [];
    const callsB: PluginContext[] = [];
    const host = await readyHost();
    host.registerPlugin(manifest(), executor(callsA));
    host.registerPlugin(manifest({ id: 'membrana.handler.other' as PluginId }), executor(callsB));
    await host.request(goodId, 'collections.collection_created', context());
    expect(callsA).toEqual([context({ trigger: 'collections.collection_created' })]);
    expect(callsB).toEqual([]);
  });
});

describe('CollectionsPluginHostService — обещание импорта контрактов живёт в экземпляре (#1972)', () => {
  class FlakyHost extends CollectionsPluginHostService {
    attempts = 0;
    constructor(private readonly failFirst: boolean) {
      super();
    }
    protected override loadContracts(): Promise<PluginContracts> {
      this.attempts += 1;
      if (this.failFirst && this.attempts === 1) return Promise.reject(new Error('import упал'));
      return Promise.resolve({ HOME_REGISTRY: { 'background-media/collections': {} }, isPluginId: (v) => typeof v === 'string' && v.includes('.') });
    }
  }

  it('ошибка импорта у одного экземпляра не залипает у другого и не залипает у него самого', async () => {
    const flaky = new FlakyHost(true);
    const healthy = new FlakyHost(false);
    await expect(flaky.onModuleInit()).rejects.toThrow('import упал');
    await expect(healthy.onModuleInit()).resolves.toBeUndefined();
    expect(() => healthy.registerPlugin(manifest(), executor([]))).not.toThrow();
    // Повтор после ошибки — новый импорт, а не тот же отказ навсегда.
    await expect(flaky.onModuleInit()).resolves.toBeUndefined();
    expect(flaky.attempts).toBe(2);
    expect(() => flaky.registerPlugin(manifest(), executor([]))).not.toThrow();
  });
});
