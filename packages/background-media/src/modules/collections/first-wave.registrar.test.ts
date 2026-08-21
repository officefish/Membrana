import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import type { BlobStorageService } from '../../blob/blob-storage.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { FirstWavePluginsRegistrar, prismaSampleReader } from './first-wave.registrar';
import { CollectionsPluginHostService } from './plugin-host.service';
import { PluginResultsBridgeService, type BridgeOutcome } from '../plugin-results-bridge/plugin-results-bridge.service';
import type { PluginId, RunRecord } from './plugin-host.types';

const CATALOG_ROOT = join(__dirname, '../../../../../data/detectors-benchmark/v0.2');
const config = { MEDIA_CATALOG_ROOT: CATALOG_ROOT } as unknown as AppConfig;

const rows = [
  // createdAt несёт модель Sample (@default(now())): порт отдаёт его наружу с 21.08 — им
  // адресуется окно сеанса у рода report. Фикстура обязана отражать модель, иначе зуб
  // проверяет не ту строку, что приходит из Prisma.
  { id: 'b', collectionId: 'c1', sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'B', storageRef: 'd/b.wav', createdAt: new Date('2026-08-21T10:00:01.000Z') },
  { id: 'a', collectionId: 'c1', sampleRate: 44100, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'A', storageRef: 'd/a.wav', createdAt: new Date('2026-08-21T10:00:00.000Z') },
];
const prisma = {
  sample: {
    findMany: async ({ where }: { where: { collectionId: string } }) => rows.filter((r) => r.collectionId === where.collectionId).sort((x, y) => (x.id < y.id ? -1 : 1)),
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id)!,
  },
} as unknown as PrismaService;
const blobs = { readBuffer: async (ref: string) => Buffer.from(ref) } as unknown as BlobStorageService;

/** Мост-шпион: ни сети, ни офиса — запоминает RunRecord и отдаёт заданный исход. */
function spyBridge(outcome: BridgeOutcome['outcome'] = 'sent') {
  const sent: RunRecord[] = [];
  const bridge = { configured: outcome !== 'office-not-configured', send: async (run: RunRecord) => { sent.push(run); return { outcome, runId: run.address.runId, attempts: outcome === 'sent' ? 1 : 0 } as BridgeOutcome; } } as unknown as PluginResultsBridgeService;
  return { bridge, sent };
}

async function registrar(cfg = config, bridge = spyBridge().bridge) {
  const host = new CollectionsPluginHostService();
  await host.onModuleInit();
  const reg = new FirstWavePluginsRegistrar(host, prisma, blobs, cfg, bridge);
  await reg.onModuleInit();
  return { host, reg };
}

describe('FirstWavePluginsRegistrar', () => {
  it('на старте модуля хост collections держит шесть плагинов первой волны, mfcc — с живым executor', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    await new FirstWavePluginsRegistrar(host, prisma, blobs, config, spyBridge().bridge).onModuleInit();
    expect(host.getRegisteredPlugins().map((m) => m.id)).toEqual([
      'membrana.handler.mfcc', 'membrana.handler.harmonic', 'membrana.handler.cepstral',
      'membrana.handler.spectral-flux', 'membrana.handler.template-match', 'membrana.handler.yamnet',
    ]);
  });

  it('читатель проб — только чтение: список по collectionId, байты по storageRef, sha256 содержимого', async () => {
    const { sha256Hex } = await import('@membrana/plugin-handlers');
    const reader = prismaSampleReader(prisma, blobs, sha256Hex);
    expect(Object.keys(reader).sort()).toEqual(['listSamples', 'readAudio']);
    const list = await reader.listSamples('c1');
    expect(list.map((s) => s.id)).toEqual(['a', 'b']);
    const audio = await reader.readAudio(list[0]!);
    expect(Buffer.from(audio.bytes).toString()).toBe('d/a.wav');
    expect(audio.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('без пресета mfcc не регистрируется, пять заглушек — регистрируются (не тихо)', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    await new FirstWavePluginsRegistrar(host, prisma, blobs, { MEDIA_CATALOG_ROOT: join(CATALOG_ROOT, 'nope') } as unknown as AppConfig, spyBridge().bridge).onModuleInit();
    expect(host.getRegisteredPlugins().map((m) => m.id)).toHaveLength(5);
    expect(host.getRegisteredPlugins().some((m) => m.id === 'membrana.handler.mfcc')).toBe(false);
  });

  describe('requestRun — вход без скрипта (b4, #1961)', () => {
    it('mfcc: контекст из deps исполнителя → хост → сид → мост; RunRecord несёт адрес, отпечатки, resumeMode fresh; исход моста в ответе', async () => {
      const { bridge, sent } = spyBridge('sent');
      const { reg } = await registrar(config, bridge);
      const out = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, collectionId: 'c1', sampleId: 'a' });
      expect(out.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(out.address).toEqual({ pluginId: 'membrana.handler.mfcc', version: expect.any(String), collectionId: 'c1', runId: out.runId, mountTarget: 'background-media/collections' });
      expect(out.fingerprints.inputHash).toMatch(/^[0-9a-f]{64}$/);
      expect(out.bridge).toMatchObject({ outcome: 'sent', runId: out.runId });
      expect(sent).toHaveLength(1);
      const record = sent[0]!;
      expect(record.address).toEqual(out.address);
      expect(record.fingerprints).toEqual(out.fingerprints);
      expect(record.resumeMode).toBe('fresh');
      expect(record.kind).toBe('handler');
      expect(sent[0]!.address.runId).toBe(out.runId);
      expect(record.completedAt).toBeInstanceOf(Date);
    });

    it('отпечатки детерминированы: два запроса на одном входе — равные inputHash/configHash, разные runId', async () => {
      const { reg } = await registrar();
      const a = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, collectionId: 'c1', sampleId: 'a' });
      const b = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, collectionId: 'c1', sampleId: 'a' });
      expect(a.fingerprints).toEqual(b.fingerprints);
      expect(a.runId).not.toBe(b.runId);
    });

    it('исход моста именем, не исключением: office-not-configured не роняет прогон', async () => {
      const { bridge } = spyBridge('office-not-configured');
      const { reg } = await registrar(config, bridge);
      const out = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, collectionId: 'c1', sampleId: 'a' });
      expect(out.bridge?.outcome).toBe('office-not-configured');
    });

    it('повод сверяется с манифестом; sample_added требует sampleId; заглушка — 501; незарегистрированный — 400', async () => {
      const { reg } = await registrar();
      // повод вне подписки манифеста (mfcc подписан только на sample_added)
      await expect(reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, collectionId: 'c1', sampleId: 'a', trigger: 'collections.collection_created' })).rejects.toMatchObject({ status: 400 });
      // умолчание — sample_added, а он без sampleId не payload M4
      await expect(reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, collectionId: 'c1' })).rejects.toMatchObject({ status: 400 });
      await expect(reg.requestRun({ pluginId: 'membrana.handler.harmonic' as PluginId, collectionId: 'c1', sampleId: 'a' })).rejects.toMatchObject({ status: 501 });
      await expect(reg.requestRun({ pluginId: 'membrana.report.nope' as PluginId, collectionId: 'c1' })).rejects.toMatchObject({ status: 400 });
    });
  });
});
