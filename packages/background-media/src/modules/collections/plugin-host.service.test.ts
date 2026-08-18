import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CollectionsPluginHostService } from './plugin-host.service';
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

describe('CollectionsPluginHostService', () => {
  it('accepts canonical PluginId and rejects a legacy slug', async () => {
    const host = new CollectionsPluginHostService();
    await expect(host.registerPlugin(manifest(), executor([]))).resolves.toBeUndefined();
    await expect(
      host.registerPlugin(manifest({ id: 'mfcc-detector' as PluginId }), executor([])),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unknown and foreign mount targets before runtime', async () => {
    const host = new CollectionsPluginHostService();
    await expect(
      host.registerPlugin(manifest({ mountTarget: 'samples' as HomeName }), executor([])),
    ).rejects.toThrow(BadRequestException);
    await expect(
      host.registerPlugin(manifest({ mountTarget: 'background-office/journal' }), executor([])),
    ).rejects.toThrow(BadRequestException);
  });

  it('notify reaches enabled matching plugins and drops disabled signals', async () => {
    const calls: PluginContext[] = [];
    const host = new CollectionsPluginHostService();
    await host.registerPlugin(manifest(), executor(calls));
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
    const host = new CollectionsPluginHostService();
    await host.registerPlugin(manifest(), executor(calls));
    expect(() => host.notify({ trigger: 'collections.sample_added', occurredAt: new Date(), payload: null })).toThrow(
      BadRequestException,
    );
    expect(calls).toEqual([]);
  });

  it('request runs exactly one enabled executor post factum', async () => {
    const callsA: PluginContext[] = [];
    const callsB: PluginContext[] = [];
    const host = new CollectionsPluginHostService();
    await host.registerPlugin(manifest(), executor(callsA));
    await host.registerPlugin(manifest({ id: 'membrana.handler.other' as PluginId }), executor(callsB));
    await host.request(goodId, 'collections.collection_created', context());
    expect(callsA).toEqual([context({ trigger: 'collections.collection_created' })]);
    expect(callsB).toEqual([]);
  });
});
