import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import type { BlobStorageService } from '../../blob/blob-storage.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { FirstWavePluginsRegistrar } from './first-wave.registrar';
import { CollectionsPluginHostService } from './plugin-host.service';

const CATALOG_ROOT = join(__dirname, '../../../../../data/detectors-benchmark/v0.2');
const config = { MEDIA_CATALOG_ROOT: CATALOG_ROOT } as unknown as AppConfig;

const rows = [
  { id: 'b', collectionId: 'c1', sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'B', storageRef: 'd/b.wav' },
  { id: 'a', collectionId: 'c1', sampleRate: 44100, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'A', storageRef: 'd/a.wav' },
];
const prisma = {
  sample: {
    findMany: async ({ where }: { where: { collectionId: string } }) => rows.filter((r) => r.collectionId === where.collectionId).sort((x, y) => (x.id < y.id ? -1 : 1)),
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id)!,
  },
} as unknown as PrismaService;
const blobs = { readBuffer: async (ref: string) => Buffer.from(ref) } as unknown as BlobStorageService;

describe('FirstWavePluginsRegistrar', () => {
  it('на старте модуля хост collections держит шесть плагинов первой волны, mfcc — с живым executor', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    await new FirstWavePluginsRegistrar(host, prisma, blobs, config).onModuleInit();
    expect(host.getRegisteredPlugins().map((m) => m.id)).toEqual([
      'membrana.handler.mfcc', 'membrana.handler.harmonic', 'membrana.handler.cepstral',
      'membrana.handler.spectral-flux', 'membrana.handler.template-match', 'membrana.handler.yamnet',
    ]);
  });

  it('читатель проб — только чтение: список по collectionId, байты по storageRef, sha256 содержимого', async () => {
    const reader = new FirstWavePluginsRegistrar(new CollectionsPluginHostService(), prisma, blobs, config).sampleReader();
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
    await new FirstWavePluginsRegistrar(host, prisma, blobs, { MEDIA_CATALOG_ROOT: join(CATALOG_ROOT, 'nope') } as unknown as AppConfig).onModuleInit();
    expect(host.getRegisteredPlugins().map((m) => m.id)).toHaveLength(5);
    expect(host.getRegisteredPlugins().some((m) => m.id === 'membrana.handler.mfcc')).toBe(false);
  });
});
