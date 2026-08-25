/**
 * Регистрация первой волны handler-плагинов в хосте `collections` на старте модуля (M6′, #1961)
 * и — с блока b4 спринта `plugin-results-bridge` — ВХОД `request` без скрипта и провод сида в мост.
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
 * ВХОД `request` (`requestRun`). До 19.08 `host.request`/`notify` из сервиса не звал никто — хост
 * собирался скриптом из dist. Контекст прогона собирается ЗДЕСЬ, потому что здесь живут deps
 * исполнителя: отпечатки считаются ТЕМ ЖЕ чтением и теми же формулами (`mfccFingerprintsOf`), что
 * сам прогон, — два соседних запроса на одном входе дают равные отпечатки по построению. `runId` —
 * UUID v7 общим помощником пакета плагинов (тот же, что у лабораторного скрипта). `resumeMode:
 * 'fresh'` — объявление старта одиночного прогона (эрратум A4-1); механизм заморозки — не этот блок.
 *
 * СИД `onResult` → мост. Хост результат `execute` не возвращает (M2/M4): единственная точка, где
 * `RunRecord` может уйти из media, — сид. Исход моста — именем (`BridgeOutcome`), не исключением:
 * сид исполняется внутри `execute`, бросок уронил бы состоявшийся прогон. `request` ждёт сид по
 * построению (`withSink` await'ит), поэтому исход моста возвращается вызывающему вместе с `runId`.
 */
import { BadRequestException, Inject, Injectable, Logger, NotImplementedException, type OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CollectionSampleReader, FirstWaveDeps, MfccExecutorDeps, ReportResultSink } from '@membrana/plugin-handlers' with { 'resolution-mode': 'import' };
import type { PluginContext, PluginId, PluginTrigger, RunRecord, RunResult } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { BlobStorageService } from '../../blob/blob-storage.service';
import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { resolveCatalogRoot } from '../../lib/catalog-paths';
import { PrismaService } from '../../prisma/prisma.service';
import { PluginResultsBridgeService, type BridgeOutcome } from '../plugin-results-bridge/plugin-results-bridge.service';
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
        // Отметка создания — ею адресуется окно сеанса у рода report (j2, #1961). Отдаётся ISO-строкой:
        // порт framework-нейтрален и о Date из Prisma знать не обязан.
        createdAt: row.createdAt.toISOString(),
      })),
    readAudio: async (sample) => {
      const row = await prisma.sample.findUniqueOrThrow({ where: { id: sample.id }, select: { storageRef: true } });
      const bytes = new Uint8Array(await blobs.readBuffer(row.storageRef));
      return { bytes, contentHash: sha256Hex(bytes) };
    },
  };
}

/**
 * Запрос прогона: повод — из подписки манифеста (умолчание — первый); `sampleId` обязателен для
 * `sample_added` — payload M4 минимум `{ collectionId, sampleId, occurredAt }`, и первая волна
 * подписана именно на него. Прогон идёт по всей коллекции (так устроен handler), `sampleId` —
 * адрес повода, а не фильтр входа.
 */
export interface RunRequest {
  readonly pluginId: PluginId;
  readonly collectionId: string;
  readonly trigger?: PluginTrigger;
  readonly sampleId?: string;
  /** Окно сеанса для родов, идущих по времени (свод). ISO-границы; см. session-digest. */
  readonly from?: string;
  readonly to?: string;
  /**
   * Набор адресов проб для родов, идущих по ПЕРЕЧНЮ, а не по окну (отбор чарт-листа, c5a).
   * Со `sampleId` и окном не сочетается: смесь не даёт сказать, что именно измерено.
   */
  readonly sampleIds?: readonly string[];
  /** Настройки отбора библиотеки (#2110): ручки человека, не форма задания. */
  readonly volume?: number;
  readonly criterion?: string;
}

export interface RunRequestOutcome {
  readonly runId: string;
  readonly address: PluginContext['address'];
  readonly fingerprints: PluginContext['fingerprints'];
  /** Исход моста для этого прогона; `null` — сид не дошёл (прогон отказал до результата). */
  readonly bridge: BridgeOutcome | null;
  /**
   * Результат исполнителя — для прогонов, чей вызывающий обязан его УВИДЕТЬ, а не только узнать,
   * что прогон был. Заведено блоком c5c спринта `chart-list-plugin`.
   *
   * Почему не через дом результатов: `RunResult` контракта — ровно два поля (`completedAt`,
   * `kind`), `RunRecord` добавляет адрес, отпечатки и режим. Измеренному в паспорте места НЕТ,
   * и офис срезал бы лишнее схемой. Правки контрактов задание запрещает (Т6), а писать измеренное
   * куда-то мимо plugin-results запрещает норма #1950.
   *
   * Двух источников правды не возникает: паспорт удостоверяет, ЧТО прогон был и по какому входу;
   * здесь возвращается то, что прогон ПОСЧИТАЛ. Паспорт измерений не несёт вовсе.
   *
   * `undefined` — обычный случай: детекторам первой волны возвращать вызывающему нечего.
   */
  readonly result?: unknown;
}

@Injectable()
export class FirstWavePluginsRegistrar implements OnModuleInit {
  private readonly logger = new Logger(FirstWavePluginsRegistrar.name);
  private handlers: Handlers | null = null;
  /** deps живого mfcc — для отпечатков при `request` тем же чтением, что у прогона. */
  private mfccDeps: MfccExecutorDeps | null = null;
  /**
   * Сборщики контекста по роду плагина: `pluginId → как собрать PluginContext`.
   *
   * СЛОВАРЬ, А НЕ ЛЕСТНИЦА `if`. До 21.08 здесь стояла одна ветка «не mfcc — значит заглушка»,
   * и она отсекла СМОНТИРОВАННЫЙ свод сеанса: плагин в доме есть, вход к нему не ведёт —
   * 501 «прогон не определён». Лабораторный путь этого не показывал (исполнитель звался
   * напрямую), поймал боевой. Словарь делает вход открытым для третьего рода без правки входа.
   */
  private readonly contextBuilders = new Map<string, (req: RunRequest) => Promise<PluginContext>>();
  /** Ожидающие исход моста по runId — только `requestRun`; notify-прогоны сюда не пишут. */
  private readonly awaiting = new Map<string, (o: BridgeOutcome) => void>();
  /** Результаты исполнителей по runId — заполняются обёрткой регистрации, читаются в requestRun. */
  private readonly results = new Map<string, unknown>();

  constructor(
    private readonly host: CollectionsPluginHostService,
    private readonly prisma: PrismaService,
    private readonly blobs: BlobStorageService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly bridge: PluginResultsBridgeService,
  ) {}

  async onModuleInit(): Promise<void> {
    const handlers = await loadHandlers();
    this.handlers = handlers;
    const toBridge = async (ctx: PluginContext, result: RunResult): Promise<void> => {
      const record: RunRecord = { ...result, address: ctx.address, fingerprints: ctx.fingerprints, resumeMode: ctx.resumeMode };
      const outcome = await this.bridge.send(record);
      this.awaiting.get(ctx.address.runId)?.(outcome);
    };
    const onReportResult: ReportResultSink = (_manifest, ctx, result) => toBridge(ctx, result);
    const onResult: FirstWaveDeps['onResult'] = async (_manifest, ctx, result) => {
      await toBridge(ctx, result);
    };
    try {
      const presetPath = join(resolveCatalogRoot(this.config), MFCC_GATES_PRESET_FILE);
      const { preset } = JSON.parse(await readFile(presetPath, 'utf8')) as { preset: Parameters<typeof handlers.mfccPipeSpecOf>[0] };
      const config = handlers.mfccConfigFromHash(preset.configHash);
      if (config === null) throw new Error(`отпечаток пресета «${preset.configHash}» не разбирается (${presetPath})`);
      const mfcc = { reader: prismaSampleReader(this.prisma, this.blobs, handlers.sha256Hex), extract: await handlers.createMeydaExtractor(config), preset, strictness: 'normal' as const };
      this.mfccDeps = { ...mfcc, manifest: handlers.MFCC_HANDLER_MANIFEST };
      handlers.registerFirstWave(this.host, { mfcc, onResult });
      // Свод сеанса — род `report`, своя волна (структурщик, j2): читатель тот же (звук лежит
      // здесь), сид тот же (единственная точка выхода результата из media), но словарь родов
      // не смешивается. Пороги отбора остаются рабочей точкой пакета до слуховой калибровки.
      handlers.registerReportWave(this.host, { reader: mfcc.reader, onResult: onReportResult });

      const mfccManifest = handlers.MFCC_HANDLER_MANIFEST;
      this.contextBuilders.set(mfccManifest.id, async (req) => ({
        address: this.addressOf(mfccManifest, req, handlers.uuidV7()),
        fingerprints: await handlers.mfccFingerprintsOf(this.mfccDeps!, req.collectionId),
        resumeMode: 'fresh',
        trigger: req.trigger ?? mfccManifest.triggers[0]!,
        payload: { collectionId: req.collectionId, sampleId: req.sampleId, occurredAt: new Date() },
      }));

      const measureManifest = handlers.CHART_LIST_MEASURE_MANIFEST;
      this.contextBuilders.set(measureManifest.id, async (req) => ({
        address: this.addressOf(measureManifest, req, handlers.uuidV7()),
        // Отпечаток входа — от СОСТАВА набора, а не от всей коллекции: прогон шёл по перечню.
        fingerprints: {
          inputHash: handlers.sha256Hex([...(req.sampleIds ?? [])].sort().join('\n')),
          configHash: handlers.sha256Hex(JSON.stringify(handlers.CHART_LIST_MEASURE_DEFAULTS)),
        },
        resumeMode: 'fresh',
        trigger: req.trigger ?? measureManifest.triggers[0]!,
        payload: { collectionId: req.collectionId, sampleIds: req.sampleIds ?? [], occurredAt: new Date() },
      }));
      this.host.registerPlugin(measureManifest, {
        execute: async (ctx) => {
          const outcome = await handlers.measureSampleSet(
            { reader: mfcc.reader },
            ctx.address.collectionId,
            handlers.sampleIdsOf(ctx.payload),
          );
          // Результат кладётся ПО runId, а не в поле службы: параллельные прогоны не должны
          // затирать друг друга — тот же довод, по которому исход моста ловится картой.
          this.results.set(ctx.address.runId, outcome);
          return { completedAt: new Date(), kind: 'report' as const };
        },
      });

      // Витрина отбора библиотеки (#2110) — второй показ семейства чарт-листа. Окно и
      // настройки едут в payload; отпечаток входа — от состава проб В ОКНЕ тем же чтением,
      // что у прогона (как у свода сеанса). Ручки человека в configHash не входят — цена
      // принята семейством: два прогона с разными настройками расходятся только runId.
      const libraryManifest = handlers.LIBRARY_CHART_LIST_MANIFEST;
      const libraryWindowOf = (req: RunRequest) => ({
        ...(req.from ? { fromMs: Date.parse(req.from) } : {}),
        ...(req.to ? { toMs: Date.parse(req.to) } : {}),
      });
      const librarySamplesOf = async (collectionId: string) => {
        const all = await mfcc.reader.listSamples(collectionId);
        // Проба без createdAt в отбор по окну не попадает МОЛЧА НЕ выбрасывается: ей ставится
        // эпоха 0 — при заданном окне она честно выпадет, без окна участвует как все.
        return all.map((d) => ({ sampleId: d.id, at: d.createdAt ? Date.parse(d.createdAt) : 0 }));
      };
      this.contextBuilders.set(libraryManifest.id, async (req) => {
        const samples = await librarySamplesOf(req.collectionId);
        const { candidates } = handlers.filterByDateWindow(samples, libraryWindowOf(req));
        return {
          address: this.addressOf(libraryManifest, req, handlers.uuidV7()),
          fingerprints: {
            inputHash: handlers.sha256Hex(candidates.map((s) => s.sampleId).sort().join('\n')),
            configHash: handlers.sha256Hex(JSON.stringify(handlers.CHART_LIST_DEFAULTS)),
          },
          resumeMode: 'fresh',
          trigger: req.trigger ?? libraryManifest.triggers[0]!,
          payload: {
            collectionId: req.collectionId,
            ...(req.from ? { from: req.from } : {}),
            ...(req.to ? { to: req.to } : {}),
            volume: req.volume ?? Number.NaN,
            criterion: req.criterion ?? '',
            occurredAt: new Date(),
          },
        };
      });
      this.host.registerPlugin(libraryManifest, {
        execute: async (ctx) => {
          const p = ctx.payload as { collectionId: string; from?: string; to?: string; volume: number; criterion: string };
          const samples = await librarySamplesOf(p.collectionId);
          const window = {
            ...(p.from ? { fromMs: Date.parse(p.from) } : {}),
            ...(p.to ? { toMs: Date.parse(p.to) } : {}),
          };
          const outcome = await handlers.runLibraryChartList(
            { measure: async (ids) => (await handlers.measureSampleSet({ reader: mfcc.reader }, p.collectionId, ids)).candidates },
            samples,
            { volume: p.volume, criterion: p.criterion },
            window,
          );
          this.results.set(ctx.address.runId, outcome);
          return { completedAt: new Date(), kind: 'showcase' as const };
        },
      });

      // Витрина дублей набора (#2109) — третий показ семейства. Чтение проб, окно и отпечаток
      // входа — те же, что у витрины отбора; ручек человека нет (порог унаследован, паспорт это
      // говорит), configHash — от умолчаний. Результат — по runId, как у соседей: ничего не удаляет.
      const duplicatesManifest = handlers.LIBRARY_DUPLICATES_MANIFEST;
      this.contextBuilders.set(duplicatesManifest.id, async (req) => {
        const samples = await librarySamplesOf(req.collectionId);
        const { candidates } = handlers.filterByDateWindow(samples, libraryWindowOf(req));
        return {
          address: this.addressOf(duplicatesManifest, req, handlers.uuidV7()),
          fingerprints: {
            inputHash: handlers.sha256Hex(candidates.map((s) => s.sampleId).sort().join('\n')),
            configHash: handlers.sha256Hex(JSON.stringify(handlers.CHART_LIST_DEFAULTS)),
          },
          resumeMode: 'fresh',
          trigger: req.trigger ?? duplicatesManifest.triggers[0]!,
          payload: {
            collectionId: req.collectionId,
            ...(req.from ? { from: req.from } : {}),
            ...(req.to ? { to: req.to } : {}),
            occurredAt: new Date(),
          },
        };
      });
      this.host.registerPlugin(duplicatesManifest, {
        execute: async (ctx) => {
          const p = ctx.payload as { collectionId: string; from?: string; to?: string };
          const samples = await librarySamplesOf(p.collectionId);
          const window = {
            ...(p.from ? { fromMs: Date.parse(p.from) } : {}),
            ...(p.to ? { toMs: Date.parse(p.to) } : {}),
          };
          const outcome = await handlers.runLibraryDuplicates(
            { measure: async (ids) => (await handlers.measureSampleSet({ reader: mfcc.reader }, p.collectionId, ids)).candidates },
            samples,
            window,
          );
          this.results.set(ctx.address.runId, outcome);
          return { completedAt: new Date(), kind: 'showcase' as const };
        },
      });

      const digestManifest = handlers.SESSION_DIGEST_MANIFEST;
      this.contextBuilders.set(digestManifest.id, async (req) => {
        // Окно приезжает от вызывающего и едет в payload: свод идёт по ОКНУ, не по пробе.
        const window = { ...(req.from ? { from: req.from } : {}), ...(req.to ? { to: req.to } : {}) };
        return {
          address: this.addressOf(digestManifest, req, handlers.uuidV7()),
          fingerprints: await handlers.sessionDigestFingerprintsOf(
            { reader: mfcc.reader }, req.collectionId, window, handlers.sha256Hex,
          ),
          resumeMode: 'fresh',
          trigger: req.trigger ?? digestManifest.triggers[0]!,
          payload: { collectionId: req.collectionId, ...window, occurredAt: new Date() },
        };
      });
    } catch (error) {
      this.logger.error({ error }, 'membrana.handler.mfcc не зарегистрирован: пресет ворот или считалка недоступны; регистрируются пять заглушек');
      for (const manifest of handlers.STUB_HANDLER_MANIFESTS) this.host.registerPlugin(manifest, handlers.notImplementedExecutor(manifest));
    }
    this.logger.log({ plugins: this.host.getRegisteredPlugins().map((m) => m.id) }, 'First-wave plugins registered');
  }

  /** Адрес прогона: пять полей из манифеста и запроса; одна формула на все рода. */
  private addressOf(manifest: { id: PluginId; version: string; mountTarget: PluginContext['address']['mountTarget'] }, req: RunRequest, runId: string): PluginContext['address'] {
    return { pluginId: manifest.id, version: manifest.version, collectionId: req.collectionId, runId, mountTarget: manifest.mountTarget };
  }

  /**
   * Прогон по запросу — вход без скрипта. Контекст собирается из deps исполнителя; хост проверяет
   * регистрацию и включённость; исход моста возвращается вместе с адресом.
   */
  async requestRun(req: RunRequest): Promise<RunRequestOutcome> {
    const handlers = this.handlers;
    if (!handlers) throw new NotImplementedException('first-wave: плагины ещё не зарегистрированы');
    const manifest = this.host.getRegisteredPlugins().find((m) => m.id === req.pluginId);
    if (!manifest) throw new BadRequestException(`Plugin ${req.pluginId} is not registered on ${this.host.mountTargetId}`);
    // Умолчание — ПЕРВЫЙ повод манифеста (у первой волны это collections.sample_added), а не общее
    // значение: повод обязан быть из подписки плагина, иначе это не request по M4, а вызов в обход.
    const trigger = req.trigger ?? manifest.triggers[0];
    if (!trigger) throw new BadRequestException(`Plugin ${req.pluginId} subscribes to no triggers`);
    if (!manifest.triggers.includes(trigger)) {
      // host.request повод по манифесту не сверяет (сверяет notify) — сверка здесь, на входе.
      throw new BadRequestException(`Plugin ${req.pluginId} does not subscribe to ${trigger} (manifest.triggers: ${manifest.triggers.join(', ')})`);
    }
    // Формы задания взаимоисключающи. Молча предпочесть одну другой значило бы измерить не то,
    // что просили, и отдать результат как заказанный — та самая подмена, которую ловит норма #1950.
    const forms = [req.sampleIds?.length ? 'набор' : null, req.sampleId ? 'проба' : null, req.from || req.to ? 'окно' : null].filter(Boolean);
    if (forms.length > 1) {
      throw new BadRequestException(`Формы задания не сочетаются: ${forms.join(' + ')} — прогон идёт по чему-то одному`);
    }
    if (req.sampleIds && req.sampleIds.length === 0) {
      throw new BadRequestException('Пустой набор проб: измерять нечего — отказ до прогона, а не пустой результат');
    }
    if (trigger === 'collections.sample_added' && !req.sampleId) {
      // Повод несёт пробу (payload M4) — без её адреса запрос неполон. Своду сеанса это
      // требование не мешает: он подписан на collection_created и о пробе не спрашивает.
      throw new BadRequestException('sample_added requires sampleId (payload M4: { collectionId, sampleId, occurredAt })');
    }
    const build = this.contextBuilders.get(req.pluginId);
    if (!build) {
      // Плагин зарегистрирован, но сборщика контекста у него нет — «не реализовано», не «плохой
      // запрос»: у заглушек первой волны отпечатков не существует, и выдумать их вход не вправе.
      throw new NotImplementedException(`Plugin ${req.pluginId}: прогон не определён (сборщик контекста не заведён)`);
    }
    const ctx: PluginContext = { ...(await build({ ...req, trigger })), trigger };
    let bridge: BridgeOutcome | null = null;
    this.awaiting.set(ctx.address.runId, (o) => { bridge = o; });
    try {
      await this.host.request(manifest.id, trigger, ctx);
    } finally {
      this.awaiting.delete(ctx.address.runId);
    }
    const result = this.results.get(ctx.address.runId);
    this.results.delete(ctx.address.runId);
    return {
      runId: ctx.address.runId,
      address: ctx.address,
      fingerprints: ctx.fingerprints,
      bridge,
      ...(result === undefined ? {} : { result }),
    };
  }
}
