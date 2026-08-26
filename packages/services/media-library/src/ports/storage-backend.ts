import type {
  Collection,
  LibraryChartListRequest,
  SessionDigestRequest,
  SessionDigestRunOutcome,
  LibraryDuplicatesRequest,
  LibraryDuplicatesRunOutcome,
  LibraryChartListRunOutcome,
  MediaSample,
  MediaPluginState,
  NewSampleMeta,
  PaginatedSamples,
  StorageQuota,
  UpdateSampleLabelNotes,
} from '../types.js';

/** Persistence port — web / Electron / server implementations. */
export interface IStorageBackend {
  getQuota(): Promise<StorageQuota>;
  listCollections(): Promise<Collection[]>;
  createCollection(name: string): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  listSamples(collectionId: string): Promise<MediaSample[]>;
  listSamplesPage(
    collectionId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedSamples>;
  putSample(
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
  ): Promise<MediaSample>;
  removeSample(sampleId: string): Promise<void>;
  moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample>;
  updateSampleLabelNotes(
    sampleId: string,
    patch: UpdateSampleLabelNotes,
  ): Promise<MediaSample>;
  readBlob(sampleId: string): Promise<Blob>;
  ensureReservedCollections(): Promise<void>;
  /**
   * Optional: отбор чарт-листа по текущему набору (#2110) — есть ТОЛЬКО у серверного бэкенда.
   *
   * Опциональность честная, а не удобная: звук набора лежит на media, и отбор идёт там, где
   * звук (та же граница, по которой измеритель живёт на сервере). Браузерный и electron-fs
   * бэкенды звать некого — сервис отвечает named-отказом, а не выдумывает пустую выборку.
   */
  requestLibraryChartList?(
    collectionId: string,
    req: LibraryChartListRequest,
  ): Promise<LibraryChartListRunOutcome>;
  /** Свод сеанса (#2039): двадцать опорных звуков окна — только серверный бэкенд. */
  requestSessionDigest?(
    collectionId: string,
    req: SessionDigestRequest,
  ): Promise<SessionDigestRunOutcome>;
  /** Пары похожих в наборе (#2109): только серверный бэкенд, ничего не удаляет. */
  requestLibraryDuplicates?(
    collectionId: string,
    req: LibraryDuplicatesRequest,
  ): Promise<LibraryDuplicatesRunOutcome>;
  /** Домовая включённость плагинов media collections (#2186): только серверный бэкенд. */
  listCollectionPlugins?(
    collectionId: string,
  ): Promise<readonly MediaPluginState[]>;
  setCollectionPluginEnabled?(
    collectionId: string,
    pluginId: string,
    enabled: boolean,
  ): Promise<void>;

  /** Optional: seed read-only tariff catalog (MemoryStorageBackend). */
  importCatalogSample?(
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
    fixedId: string,
  ): Promise<MediaSample>;
}
