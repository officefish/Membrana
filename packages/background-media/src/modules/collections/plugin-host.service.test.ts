import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CollectionsPluginHostService } from './plugin-host.service';
import type { PluginId, PluginRuntime } from './plugin-host.types';

const goodId = 'scope/plugin' as PluginId;

function plugin(over: Partial<PluginRuntime['manifest']> = {}, calls: unknown[] = []): PluginRuntime {
  return {
    manifest: {
      id: goodId,
      kind: 'handler',
      version: '1.0.0',
      mountTarget: 'background-media/collections',
      triggers: ['background-media.collections.changed'],
      ...over,
    },
    handle: async (trigger, ctx) => calls.push({ trigger, ctx }),
  };
}

describe('CollectionsPluginHostService', () => {
  it('rejects unknown hosts, foreign hosts and invalid PluginId before runtime', () => {
    const host = new CollectionsPluginHostService();
    expect(() => host.registerPlugin(plugin({ mountTarget: 'samples' }))).toThrow(BadRequestException);
    expect(() => host.registerPlugin(plugin({ mountTarget: 'background-office/journal' }))).toThrow(BadRequestException);
    expect(() => host.registerPlugin(plugin({ id: 'Bad Id' as PluginId }))).toThrow(BadRequestException);
  });

  it('notify reaches enabled matching plugins and drops disabled signals', async () => {
    const calls: unknown[] = [];
    const host = new CollectionsPluginHostService();
    host.registerPlugin(plugin({}, calls));
    await host.notify({ trigger: 'other', ctx: 1 });
    await host.notify({ trigger: 'background-media.collections.changed', ctx: 2 });
    host.setPluginEnabled(goodId, false);
    await host.notify({ trigger: 'background-media.collections.changed', ctx: 3 });
    expect(calls).toEqual([{ trigger: 'background-media.collections.changed', ctx: 2 }]);
    expect(host.getRegisteredPlugins()).toEqual([{ manifest: plugin().manifest, enabled: false }]);
  });

  it('request runs exactly one enabled plugin post factum', async () => {
    const callsA: unknown[] = [];
    const callsB: unknown[] = [];
    const host = new CollectionsPluginHostService();
    host.registerPlugin(plugin({}, callsA));
    host.registerPlugin(plugin({ id: 'scope/other' as PluginId }, callsB));
    await host.request(goodId, 'manual', { collectionId: 'c1' });
    expect(callsA).toEqual([{ trigger: 'manual', ctx: { collectionId: 'c1' } }]);
    expect(callsB).toEqual([]);
  });
});
