/**
 * Регистрация первой волны handler-плагинов в хосте `collections` на старте модуля (M6′, #1961).
 *
 * Читатель проб — in-process и ТОЛЬКО чтение: `prisma.sample.findMany` по `collectionId` +
 * `BlobStorageService.readBuffer` (норма #1950). Не `SamplesService.list`: тот скопирован под
 * устройство (`deviceId`), которого в `PluginContext` нет — адрес прогона несёт `collectionId`.
 * Адаптер вынесен функцией `prismaSampleReader` — у него свой контракт (порт из двух читающих
 * членов) и свой зуб; регистратор его только собирает.
 *
 * Пресет ворот mfcc — из каталога (`resolveCatalogRoot`, тот же `data/detectors-benchmark/v0.2`,
 * что копируется в образ): пороги не трогаются. Считалка — `createMeydaExtractor` из пакета плагинов
 * (единственная точка настройки meyda). Нет пресета/считалки — mfcc не регистрируется, пять заглушек
 * регистрируются, ошибка пишется в лог громко (не тихо).
 *
 * `onResult` — сид моста к дому результатов (офис, `plugin-results`): хост результат `execute`
 * не возвращает; сегодня сид пишет в лог сводку прогона; сам мост media → office — #1961.
 */
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CollectionSampleReader, FirstWaveDeps } from '@membrana/plugin-handlers' with { 'resolution-mode': 'import' };
import { BlobStorageService } from '../../blob/blob-storage.service';
import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { resolveCatalogRoot } from '../../lib/catalog-paths';
import { PrismaService } from '../../prisma/prisma.service';
import { CollectionsPluginHostService } from './plugin-host.service';

export const MFCC_GATES_PRESET_FILE = join('reports', 'mfcc-gates-first-cut.json');

type Handlers = Awaited<ReturnType<typeof loadHandlers>>;
const loadHandlers = () => import('@membrana/plugin-handlers');

/** Порт чтения проб поверх Prisma и блобов: два члена, оба читают. */
export function prismaSampleReader(prisma: PrismaService, blobs: BlobStorageService, sha256Hex: Handlers['sha256Hex']): CollectionSampleReader {
  return {
    listSamples: async (collectionId) =>
      (await prisma.sample.findMany({ where: { collectionId }, orderBy: { id: 'asc' } })).map((row) => ({
        id: row.id, sampleRate: row.sampleRate, channels: row.channels, audioFormat: row.audioFormat, sizeBytes: row.sizeBytes, title: row.title,
      })),
    readAudio: async (sample) => {
      const row = await prisma.sample.findUniqueOrThrow({ where: { id: sample.id }, select: { storageRef: true } });
      const bytes = new Uint8Array(await blobs.readBuffer(row.storageRef));
      return { bytes, contentHash: sha256Hex(bytes) };
    },
  };
}

@Injectable()
export class FirstWavePluginsRegistrar implements OnModuleInit {
  private readonly logger = new Logger(FirstWavePluginsRegistrar.name);

  constructor(
    private readonly host: CollectionsPluginHostService,
    private readonly prisma: PrismaService,
    private readonly blobs: BlobStorageService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    const handlers = await loadHandlers();
    const onResult: FirstWaveDeps['onResult'] = (manifest, ctx, result) =>
      this.logger.log({ pluginId: manifest.id, runId: ctx.address.runId, kind: result.kind }, 'Plugin run completed (мост в plugin-results — #1961)');
    try {
      const presetPath = join(resolveCatalogRoot(this.config), MFCC_GATES_PRESET_FILE);
      const { preset } = JSON.parse(await readFile(presetPath, 'utf8')) as { preset: Parameters<typeof handlers.mfccPipeSpecOf>[0] };
      const config = handlers.mfccConfigFromHash(preset.configHash);
      if (config === null) throw new Error(`отпечаток пресета «${preset.configHash}» не разбирается (${presetPath})`);
      handlers.registerFirstWave(this.host, {
        mfcc: { reader: prismaSampleReader(this.prisma, this.blobs, handlers.sha256Hex), extract: await handlers.createMeydaExtractor(config), preset, strictness: 'normal' },
        onResult,
      });
    } catch (error) {
      this.logger.error({ error }, 'membrana.handler.mfcc не зарегистрирован: пресет ворот или считалка недоступны; регистрируются пять заглушек');
      for (const manifest of handlers.STUB_HANDLER_MANIFESTS) this.host.registerPlugin(manifest, handlers.notImplementedExecutor(manifest));
    }
    this.logger.log({ plugins: this.host.getRegisteredPlugins().map((m) => m.id) }, 'First-wave plugins registered');
  }
}
