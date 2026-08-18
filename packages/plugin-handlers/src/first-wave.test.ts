import { isPluginId, type IPluginEvent, type IPluginHost, type PluginContext, type PluginExecutor, type PluginId, type PluginManifest, type PluginTrigger } from '@membrana/plugin-contracts';
import { describe, expect, it } from 'vitest';
import { FIRST_WAVE_MANIFESTS, registerFirstWave } from './first-wave.js';
import { PluginNotImplementedError, STUB_HANDLER_MANIFESTS } from './stubs.js';

/** Минимальный хост-заглушка ПО ИНТЕРФЕЙСУ M2/M4/M5′ — не копия хоста PR-2, а его контрактная форма. */
function fakeHost(): IPluginHost & { executors: Map<PluginId, PluginExecutor> } {
  const registry = new Map<PluginId, { manifest: PluginManifest; executor: PluginExecutor; enabled: boolean }>();
  return {
    mountTargetId: 'background-media/collections',
    executors: new Map(),
    registerPlugin(manifest, executor) {
      if (manifest.mountTarget !== this.mountTargetId) throw new Error(`чужой дом ${manifest.mountTarget}`);
      registry.set(manifest.id, { manifest, executor, enabled: true });
      this.executors.set(manifest.id, executor);
    },
    getRegisteredPlugins: () => [...registry.values()].map((r) => r.manifest),
    notify: (_event: IPluginEvent) => undefined,
    async request(pluginId: PluginId, _trigger: PluginTrigger, ctx: PluginContext) { await registry.get(pluginId)!.executor.execute(ctx); },
    setPluginEnabled(id, enabled) { registry.get(id)!.enabled = enabled; },
  };
}

const ctx = (pluginId: PluginId): PluginContext => ({
  address: { pluginId, version: '0.1.0', collectionId: 'c', runId: 'r', mountTarget: 'background-media/collections' },
  fingerprints: { inputHash: 'i', configHash: 'c' },
  resumeMode: 'fresh',
  trigger: 'collections.sample_added',
  payload: {},
});

const PRESET = {
  configHash: 'mel40-c24-buf4096-sr48000',
  bounds: Array.from({ length: 24 }, () => ({ min: -1, max: 1 })),
  judgedCoefficients: [0, 1, 2, 3],
  minMagnitude: 0,
  strictness: { easy: { minInBandRatio: 0.25, minPassRate: 0.3 }, normal: { minInBandRatio: 0.5, minPassRate: 0.6 }, strict: { minInBandRatio: 1, minPassRate: 0.9 } },
};

describe('первая волна — шесть handler в хосте collections', () => {
  it('registerFirstWave регистрирует шесть; все id — формата M1, все — род handler и дом collections', () => {
    const host = fakeHost();
    const registered = registerFirstWave(host, {
      mfcc: { reader: { listSamples: async () => [], readAudio: async () => ({ bytes: new Uint8Array(), contentHash: '' }) }, extract: () => [], preset: PRESET, strictness: 'normal' },
    });
    const ids = host.getRegisteredPlugins().map((m) => m.id);
    expect(ids).toEqual([
      'membrana.handler.mfcc', 'membrana.handler.harmonic', 'membrana.handler.cepstral',
      'membrana.handler.spectral-flux', 'membrana.handler.template-match', 'membrana.handler.yamnet',
    ]);
    expect(registered).toBe(FIRST_WAVE_MANIFESTS);
    for (const m of host.getRegisteredPlugins()) {
      expect(isPluginId(m.id)).toBe(true);
      expect(m).toMatchObject({ kind: 'handler', mountTarget: 'background-media/collections', triggers: ['collections.sample_added'], windowSize: 1 });
      expect(Object.keys(m).sort()).toEqual(['id', 'kind', 'mountTarget', 'triggers', 'version', 'windowSize']);
    }
  });

  it('заглушки пяти не молчат: execute — именованный отказ с id плагина и поводом', async () => {
    const host = fakeHost();
    registerFirstWave(host, {
      mfcc: { reader: { listSamples: async () => [], readAudio: async () => ({ bytes: new Uint8Array(), contentHash: '' }) }, extract: () => [], preset: PRESET, strictness: 'normal' },
    });
    for (const m of STUB_HANDLER_MANIFESTS) {
      const err = await host.executors.get(m.id)!.execute(ctx(m.id)).then(() => null, (e: unknown) => e);
      expect(err).toBeInstanceOf(PluginNotImplementedError);
      expect((err as PluginNotImplementedError).pluginId).toBe(m.id);
      expect((err as Error).message).toMatch(new RegExp(`${m.id}.*не реализован.*collections\\.sample_added`, 'u'));
      expect((err as Error).name).toBe('PluginNotImplementedError');
    }
  });
});
