import { DomainError } from '@membrana/core';

import { createBrowserLimitedStorageBackend } from './backends/memory-storage-backend.js';
import { seedBundledCatalogIfEmpty } from './bundled-catalog.js';
import {
  BUFFER_COLLECTION_ID,
  DEFAULT_MEDIA_LIBRARY_CONFIG,
  DEFAULT_SAMPLES_PAGE_SIZE,
  TARIFF_DATASET_COLLECTION_ID,
  type MediaLibraryConfig,
} from './constants.js';
import { mediaLibraryTrace, traceElapsedMs } from './media-library-trace.js';
import { isBufferSampleCountCapActive } from './quota-status.js';
import type { IStorageBackend } from './ports/storage-backend.js';
import type {
  DeleteByIdsOutcome,
  MoveBatchOutcome,
  BufferCleanupPlanOutcome,
  BufferCleanupPlanRequest,
  LibraryChartListRequest,
  LibraryChartListRunOutcome,
  SessionDigestRequest,
  SessionDigestRunOutcome,
  LibraryDuplicatesRequest,
  LibraryDuplicatesRunOutcome,
  Collection,
  CollectionDetectorBatchRequest,
  CollectionDetectorBatchRunOutcome,
  ImportBlobOptions,
  MediaLibrarySnapshot,
  MediaSample,
  MediaPluginState,
  NewSampleMeta,
  PaginatedSamples,
  StorageQuota,
} from './types.js';

export class MediaLibraryService {
  private readonly backend: IStorageBackend;

  private readonly config: MediaLibraryConfig;

  private listeners = new Set<() => void>();

  private version = 0;

  private initialized = false;

  private initPromise: Promise<void> | null = null;

  /** Идущая сверка открытия (#2569): параллельные вызовы (StrictMode) сливаются в один залп. */
  private reconcilePromise: Promise<void> | null = null;

  /**
   * Каталог, для которого в снимке загружены пробы базового набора (#2569). Держится отдельно от
   * `snapshot.quota.dataset`: квоту каждые 30 с перечитывает мост (`refreshQuota`), и сменённый
   * каталог доехал бы в снимок раньше, чем перечитаны его пробы, — сверка открытия решила бы
   * «тот же». Живёт в памяти сервиса: перезапуск и так читает всё через `init()`.
   */
  private datasetSamplesCatalogId: string | undefined;

  private snapshot: MediaLibrarySnapshot = {
    collections: [],
    samplesByCollection: {},
    quota: {
      usedBytes: 0,
      limitBytes: DEFAULT_MEDIA_LIBRARY_CONFIG.localQuotaBytes,
      backend: 'browser-limited',
      serverReachable: false,
    },
    version: 0,
  };

  constructor(backend: IStorageBackend, config?: Partial<MediaLibraryConfig>) {
    this.backend = backend;
    this.config = { ...DEFAULT_MEDIA_LIBRARY_CONFIG, ...config };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): MediaLibrarySnapshot {
    return this.snapshot;
  }

  getConfig(): MediaLibraryConfig {
    return this.config;
  }

  private emit(): void {
    this.version += 1;
    this.listeners.forEach((l) => l());
  }

  /** Incremental snapshot update after upload (avoids full catalog re-list). */
  private async mergeImportedSample(sample: MediaSample): Promise<void> {
    const mergeStartedAt = performance.now();
    mediaLibraryTrace('snapshot-merge-start', {
      collectionId: sample.collectionId,
      sampleId: sample.id,
    });

    const collectionId = sample.collectionId;
    const existing = this.snapshot.samplesByCollection[collectionId] ?? [];
    const withoutDuplicate = existing.filter((row) => row.id !== sample.id);

    this.snapshot = {
      ...this.snapshot,
      samplesByCollection: {
        ...this.snapshot.samplesByCollection,
        [collectionId]: [sample, ...withoutDuplicate],
      },
      collections: this.snapshot.collections.map((col) =>
        col.id === collectionId
          ? { ...col, sampleCount: withoutDuplicate.length + 1 }
          : col,
      ),
    };

    try {
      const quota = await this.backend.getQuota();
      this.snapshot = { ...this.snapshot, quota: this.mergeQuota(quota) };
      mediaLibraryTrace('snapshot-quota-done', { elapsedMs: traceElapsedMs(mergeStartedAt) });
    } catch {
      mediaLibraryTrace('snapshot-quota-skip', { reason: 'getQuota-failed' });
    }

    this.emit();
    mediaLibraryTrace('snapshot-merge-done', {
      collectionId,
      sampleId: sample.id,
      elapsedMs: traceElapsedMs(mergeStartedAt),
    });
  }

  async refresh(): Promise<void> {
    const refreshStartedAt = performance.now();
    mediaLibraryTrace('refresh-start');

    const ensureStartedAt = performance.now();
    mediaLibraryTrace('ensure-reserved-start');
    await this.backend.ensureReservedCollections();
    mediaLibraryTrace('ensure-reserved-done', { elapsedMs: traceElapsedMs(ensureStartedAt) });

    const listColStartedAt = performance.now();
    const collections = await this.backend.listCollections();
    mediaLibraryTrace('listCollections-done', {
      count: collections.length,
      elapsedMs: traceElapsedMs(listColStartedAt),
    });

    const samplesByCollection: Record<string, MediaSample[]> = {};
    for (const c of collections) {
      const listSamplesStartedAt = performance.now();
      samplesByCollection[c.id] = await this.backend.listSamples(c.id);
      mediaLibraryTrace('listSamples-done', {
        collectionId: c.id,
        count: samplesByCollection[c.id]?.length ?? 0,
        elapsedMs: traceElapsedMs(listSamplesStartedAt),
      });
    }

    const quotaStartedAt = performance.now();
    const quota = await this.backend.getQuota();
    mediaLibraryTrace('quota-done', { elapsedMs: traceElapsedMs(quotaStartedAt) });
    if (quota.dataset) this.datasetSamplesCatalogId = quota.dataset.catalogId;

    this.snapshot = {
      collections,
      samplesByCollection,
      quota: this.mergeQuota(quota),
      version: this.version,
    };
    this.emit();
    mediaLibraryTrace('refresh-done', { elapsedMs: traceElapsedMs(refreshStartedAt) });
  }

  /**
   * Лёгкое перечитывание предела (#2538): один `getQuota()`, без списков коллекций и проб.
   *
   * Полный `refresh()` читает квоту ПОСЛЕДНИМ шагом после списка всех проб: любой сбой раньше
   * оставлял в снимке прежний предел без следа (живой опыт 01.10 — 512 МБ при сервере 2 ГБ).
   * Здесь предел читается сам, одним запросом, и получает момент чтения (`readAt`).
   * Списки снимка не трогаются; emit один. Бросает только то, что бросил бэкенд.
   */
  async refreshQuota(): Promise<void> {
    const startedAt = performance.now();
    mediaLibraryTrace('refreshQuota-start');
    const quota = await this.backend.getQuota();
    this.snapshot = { ...this.snapshot, quota: this.mergeQuota(quota) };
    this.emit();
    mediaLibraryTrace('refreshQuota-done', { elapsedMs: traceElapsedMs(startedAt) });
  }

  /**
   * Сверка с сервером при открытии библиотеки (#2569; слово владельца 03.10: «коллекции должны
   * пересматриваться при открытии библиотеки»; глубже — только при смене тарифа).
   *
   * Не инициализирован → `init()` и всё: init уже читает полностью, второй сверки нет.
   * Иначе ЛЁГКАЯ сверка — всегда: ensure-reserved (сервер чинит заводское имя набора) + список
   * коллекций + квота, три малых запроса, ни одного списка проб. Коллекции снимка заменяются,
   * пробы не трогаются. ГЛУБЖЕ — только базовый набор и только когда сменился назначенный каталог
   * (`quota.dataset.catalogId`) или `sampleCount` набора разошёлся с загруженным списком (фоновый
   * досев). Пробы буфера (тысячи, постранично по 40) на этом пути не читаются никогда.
   * Зовёт модуль библиотеки при монтировании, НЕ хук `useMediaLibrary` (его зовут и панели).
   */
  async reconcileOnOpen(): Promise<void> {
    if (!this.initialized) {
      await this.init();
      return;
    }
    if (!this.reconcilePromise) {
      this.reconcilePromise = this.runReconcileOnOpen().finally(() => {
        this.reconcilePromise = null;
      });
    }
    await this.reconcilePromise;
  }

  private async runReconcileOnOpen(): Promise<void> {
    const startedAt = performance.now();
    mediaLibraryTrace('reconcile-start');
    await this.backend.ensureReservedCollections();
    const collections = await this.backend.listCollections();
    const quota = await this.backend.getQuota();

    const live = new Set(collections.map((c) => c.id));
    const prev = this.snapshot.samplesByCollection;
    let samplesByCollection = Object.keys(prev).every((id) => live.has(id))
      ? prev
      : Object.fromEntries(Object.entries(prev).filter(([id]) => live.has(id)));

    const dataset = collections.find((c) => c.id === TARIFF_DATASET_COLLECTION_ID);
    const loadedCount = prev[TARIFF_DATASET_COLLECTION_ID]?.length ?? 0;
    const catalogChanged =
      quota.dataset !== undefined && quota.dataset.catalogId !== this.datasetSamplesCatalogId;
    const reseeded = dataset?.sampleCount !== undefined && dataset.sampleCount !== loadedCount;
    if (dataset && (catalogChanged || reseeded)) {
      const rows = await this.backend.listSamples(TARIFF_DATASET_COLLECTION_ID);
      samplesByCollection = { ...samplesByCollection, [TARIFF_DATASET_COLLECTION_ID]: rows };
      if (quota.dataset) this.datasetSamplesCatalogId = quota.dataset.catalogId;
    }

    this.snapshot = {
      ...this.snapshot,
      collections,
      samplesByCollection,
      quota: this.mergeQuota(quota),
    };
    this.emit();
    mediaLibraryTrace('reconcile-done', {
      collections: collections.length,
      datasetReloaded: dataset !== undefined && (catalogChanged || reseeded),
      catalogChanged,
      reseeded,
      elapsedMs: traceElapsedMs(startedAt),
    });
  }

  /**
   * Единственное место, где прочитанная квота ложится в снимок (#2538).
   *
   * Успех — числа бэкенда и свежий `readAt`. Отказ серверного чтения (`serverReachable=false`)
   * прежний предел НЕ стирает: числа остаются, `serverReachable` опускается, `readAt` — момент
   * последнего успешного чтения (развилка 4 плана — слово владельца: «прежний предел с пометкой
   * „снимок от …“, числа не скрываем»). Пока успешного серверного чтения не было (снимок ещё
   * локальный), отказ ложится как есть — нули без `readAt`: нечего помечать «снимком от».
   */
  private mergeQuota(next: StorageQuota): StorageQuota {
    const failed = next.backend === 'server' && !next.serverReachable;
    if (!failed) return { ...next, readAt: new Date().toISOString() };
    const prev = this.snapshot.quota;
    if (prev.backend === 'server' && prev.readAt !== undefined) {
      return { ...prev, serverReachable: false };
    }
    return next;
  }

  async listSamplesPage(
    collectionId: string,
    page = 1,
    limit = DEFAULT_SAMPLES_PAGE_SIZE,
  ): Promise<PaginatedSamples> {
    return this.backend.listSamplesPage(collectionId, page, limit);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.runInit()
        .then(() => {
          this.initialized = true;
        })
        .finally(() => {
          this.initPromise = null;
        });
    }
    await this.initPromise;
  }

  private async runInit(): Promise<void> {
    await this.backend.ensureReservedCollections();
    await seedBundledCatalogIfEmpty(this.backend, {
      assetBaseUrl: '/catalog/free-v1',
    });
    await this.refresh();
  }

  async createUserCollection(name: string): Promise<Collection> {
    const col = await this.backend.createCollection(name);
    await this.refresh();
    return col;
  }

  async deleteUserCollection(id: string): Promise<void> {
    await this.backend.deleteCollection(id);
    await this.refresh();
  }

  async importBlob(
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
    options?: ImportBlobOptions,
  ): Promise<MediaSample> {
    // Cold uploads must not depend on a previous init()/refresh creating __buffer__.
    await this.backend.ensureReservedCollections();

    const importStartedAt = performance.now();
    mediaLibraryTrace('importBlob-start', {
      collectionId,
      title: meta.title,
      sizeBytes: blob.size,
      skipRefresh: options?.skipRefresh ?? false,
    });

    if (collectionId === BUFFER_COLLECTION_ID) {
      const quota = this.snapshot.quota;
      if (isBufferSampleCountCapActive(quota)) {
        const bufferSamples = await this.backend.listSamples(BUFFER_COLLECTION_ID);
        if (bufferSamples.length >= this.config.maxBufferSamples) {
          throw new DomainError('Buffer sample limit reached', 'BUFFER_FULL');
        }
      }
    }

    const putSampleStartedAt = performance.now();
    mediaLibraryTrace('putSample-start', { collectionId, title: meta.title, sizeBytes: blob.size });
    const sample = await this.backend.putSample(collectionId, blob, meta);
    mediaLibraryTrace('putSample-done', {
      collectionId,
      sampleId: sample.id,
      elapsedMs: traceElapsedMs(putSampleStartedAt),
    });

    if (options?.skipRefresh === true) {
      await this.mergeImportedSample(sample);
    } else {
      await this.refresh();
    }

    mediaLibraryTrace('importBlob-done', {
      collectionId,
      sampleId: sample.id,
      skipRefresh: options?.skipRefresh ?? false,
      elapsedMs: traceElapsedMs(importStartedAt),
    });
    return sample;
  }

  async removeSample(sampleId: string): Promise<void> {
    await this.backend.removeSample(sampleId);
    await this.refresh();
  }

  /**
   * Отбор чарт-листа по текущему набору (#2110). Есть только у серверного бэкенда: звук
   * набора лежит на media, отбор идёт там же. Остальным — named-отказ, не пустая выборка.
   */
  async requestLibraryChartList(
    collectionId: string,
    req: LibraryChartListRequest,
  ): Promise<LibraryChartListRunOutcome> {
    if (!this.backend.requestLibraryChartList) {
      throw new Error('Отбор чарт-листа доступен только при серверной библиотеке (media-server)');
    }
    return this.backend.requestLibraryChartList(collectionId, req);
  }

  async requestCollectionDetectorBatch(
    collectionId: string,
    req: CollectionDetectorBatchRequest = {},
  ): Promise<CollectionDetectorBatchRunOutcome> {
    if (!this.backend.requestCollectionDetectorBatch) {
      throw new Error('Batch-прогон детекторов доступен только при серверной библиотеке (media-server)');
    }
    return this.backend.requestCollectionDetectorBatch(collectionId, req);
  }

  /** Свод сеанса (#2039): двадцать опорных звуков окна. Ядро отчёта — на media, здесь только заказ. */
  async requestSessionDigest(
    collectionId: string,
    req: SessionDigestRequest = {},
  ): Promise<SessionDigestRunOutcome> {
    if (!this.backend.requestSessionDigest) {
      throw new Error('Свод сеанса доступен только при серверной библиотеке (media-server)');
    }
    return this.backend.requestSessionDigest(collectionId, req);
  }

  /** Пары похожих в наборе (#2109). Ничего не удаляет — удаление только по клику, отдельным глаголом removeSample. */
  async requestLibraryDuplicates(
    collectionId: string,
    req: LibraryDuplicatesRequest = {},
  ): Promise<LibraryDuplicatesRunOutcome> {
    if (!this.backend.requestLibraryDuplicates) {
      throw new Error('Поиск дублей доступен только при серверной библиотеке (media-server)');
    }
    return this.backend.requestLibraryDuplicates(collectionId, req);
  }

  /**
   * План уборки буфера (#2204): что уйдёт при выбранных принципе и объёме. Ничего не меняет,
   * звать можно сколько угодно — на этом и держится правило «сперва покажи».
   */
  async planBufferCleanup(
    collectionId: string,
    req: BufferCleanupPlanRequest,
  ): Promise<BufferCleanupPlanOutcome> {
    if (!this.backend.planBufferCleanup) {
      throw new Error('Управление буфером доступно только при серверной библиотеке (media-server)');
    }
    return this.backend.planBufferCleanup(collectionId, req);
  }

  /**
   * Удаление ПО СПИСКУ: уходят РОВНО перечисленные, список берётся из показанного человеку.
   * Глагола «удали сто ранних» здесь нет намеренно — удаление необратимо.
   *
   * ИМЯ ПО СМЫСЛУ, А НЕ ПО ПЕРВОМУ ЗАКАЗЧИКУ (#2250). Путь родился уборкой буфера (#2204) и
   * назывался ею, хотя буфером не ограничен ни на грамм: сервер принимает список и проверяет
   * владение ЛЮБЫМ набором. Пока имя говорило «буфер», удаление пачкой из панели выглядело
   * как отсутствующий механизм — и второй такой же завёлся бы рядом. Это ровно то расхождение,
   * что чинили 30–31.08: имя, отставшее от смысла, порождает близнеца.
   */
  async deleteSamplesByIds(
    collectionId: string,
    sampleIds: readonly string[],
  ): Promise<DeleteByIdsOutcome> {
    if (!this.backend.deleteSamplesByIds) {
      throw new Error('Удаление по списку доступно только при серверной библиотеке (media-server)');
    }
    return this.backend.deleteSamplesByIds(collectionId, sampleIds);
  }

  async listCollectionPlugins(collectionId: string): Promise<readonly MediaPluginState[]> {
    if (!this.backend.listCollectionPlugins) {
      throw new Error('Список плагинов библиотеки доступен только при серверной библиотеке (media-server)');
    }
    return this.backend.listCollectionPlugins(collectionId);
  }

  async setCollectionPluginEnabled(
    collectionId: string,
    pluginId: string,
    enabled: boolean,
  ): Promise<void> {
    if (!this.backend.setCollectionPluginEnabled) {
      throw new Error('Переключение плагинов библиотеки доступно только при серверной библиотеке (media-server)');
    }
    await this.backend.setCollectionPluginEnabled(collectionId, pluginId, enabled);
  }

  async moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample> {
    const moved = await this.backend.moveSample(sampleId, toCollectionId);
    await this.refresh();
    return moved;
  }

  /**
   * МАССОВЫЙ ВЫВОЗ ПРОБ ИЗ БУФЕРА В НАБОР — одно действие человека «перенести все».
   *
   * Цикл по `moveSample` тут не годится по той же причине, по какой не годился при удалении
   * пачкой: тысяча запросов даёт худший из возможных ответов — отказ на пятисотой и никакого
   * внятного числа. Место считает сервер по осям квоты, потому что перенос ПЕРЕЛИВАЕТ байты из
   * оси буфера в ось наборов, и половина этой арифметики в браузере жить не может.
   *
   * `dryRun` — счёт без движения: то, что окно показывает до подтверждения. Обновление
   * снимка после него НЕ делается — двигать было нечего, а лишний обход страниц на полном
   * буфере не бесплатен.
   */
  async moveSamplesBatch(
    sampleIds: readonly string[],
    toCollectionId: string,
    options: { readonly dryRun?: boolean } = {},
  ): Promise<MoveBatchOutcome> {
    if (!this.backend.moveSamplesBatch) {
      throw new Error('Массовый перенос доступен только при серверной библиотеке (media-server)');
    }
    const outcome = await this.backend.moveSamplesBatch(sampleIds, toCollectionId, options);
    if (options.dryRun !== true && outcome.moved.length > 0) {
      await this.refresh();
    }
    return outcome;
  }

  async updateSampleLabelNotes(
    sampleId: string,
    patch: import('./types.js').UpdateSampleLabelNotes,
  ): Promise<MediaSample> {
    const updated = await this.backend.updateSampleLabelNotes(sampleId, patch);
    await this.refresh();
    return updated;
  }

  async clearBuffer(): Promise<void> {
    const samples = await this.backend.listSamples(BUFFER_COLLECTION_ID);
    for (const s of samples) {
      await this.backend.removeSample(s.id);
    }
    await this.refresh();
  }

  getBackend(): IStorageBackend {
    return this.backend;
  }

  async getSampleBlob(sampleId: string): Promise<Blob> {
    return this.backend.readBlob(sampleId);
  }
}

let defaultService: MediaLibraryService | null = null;

export function createMediaLibraryService(
  backend: IStorageBackend,
  config?: Partial<MediaLibraryConfig>,
): MediaLibraryService {
  return new MediaLibraryService(backend, config);
}

export function getDefaultMediaLibraryService(): MediaLibraryService {
  if (!defaultService) {
    defaultService = createMediaLibraryService(
      createBrowserLimitedStorageBackend(DEFAULT_MEDIA_LIBRARY_CONFIG.localQuotaBytes),
    );
  }
  return defaultService;
}

/** Replace singleton backend (e.g. switch to remote-server after pairing). */
export function configureDefaultMediaLibraryService(
  backend: IStorageBackend,
  config?: Partial<MediaLibraryConfig>,
): MediaLibraryService {
  defaultService = createMediaLibraryService(backend, config);
  return defaultService;
}

export function resetDefaultMediaLibraryServiceForTests(): void {
  defaultService = null;
}

export function setDefaultMediaLibraryServiceForTests(service: MediaLibraryService): void {
  defaultService = service;
}
