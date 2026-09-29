export type CollectionKind = 'buffer' | 'user' | 'system';

export type SampleLabel = 'drone' | 'not-drone' | 'unlabeled';

export type SampleSource =
  | 'mic-recording'
  | 'disk-import'
  | 'synthetic'
  | 'move'
  | 'copy'
  | 'catalog';

export interface Collection {
  id: string;
  name: string;
  kind: CollectionKind;
  createdAt: string;
  updatedAt: string;
  systemKey?: 'tariff-dataset';
  /** Server-reported count; may be set before samples are loaded into snapshot. */
  sampleCount?: number;
}

export interface MediaSample {
  id: string;
  collectionId: string;
  title: string;
  class: string;
  label: SampleLabel;
  source: SampleSource;
  durationSec: number;
  sampleRate: number;
  channels: 1 | 2;
  createdAt: string;
  storageRef: string;
  notes?: string;
  sizeBytes: number;
}

export type StorageBackendKind = 'server' | 'browser-limited' | 'electron-fs';

export interface StorageQuota {
  /** User collections quota (or combined quota for browser-limited). */
  usedBytes: number;
  limitBytes: number;
  backend: StorageBackendKind;
  serverReachable: boolean;
  /** Buffer collection quota — set when backend tracks buffer separately (server). */
  bufferUsedBytes?: number;
  bufferLimitBytes?: number;
}

export interface NewSampleMeta {
  title: string;
  class: string;
  label: SampleLabel;
  source: SampleSource;
  durationSec: number;
  sampleRate: number;
  channels?: 1 | 2;
  notes?: string;
}

/** Options for {@link MediaLibraryService.importBlob}. */
export interface ImportBlobOptions {
  /**
   * Skip full {@link MediaLibraryService.refresh} after upload.
   * Merges the new sample into snapshot + refreshes quota only (scenario runtime hot path).
   */
  readonly skipRefresh?: boolean;
}

/** Partial update for ground-truth curation (VDR1). */
export interface UpdateSampleLabelNotes {
  label?: SampleLabel;
  notes?: string | null;
}

export interface MediaLibrarySnapshot {
  collections: Collection[];
  samplesByCollection: Record<string, MediaSample[]>;
  quota: StorageQuota;
  version: number;
}

export interface MediaPluginManifest {
  id: string;
  version: string;
  kind: 'handler' | 'report' | 'showcase';
  mountTarget: string;
  triggers: readonly string[];
  displayForm?: string;
  description?: string;
}

export interface MediaPluginState {
  manifest: MediaPluginManifest;
  enabled: boolean;
}

/** Transport mirror of the canonical plugin-contracts batch result. */
export interface CollectionDetectorBatchRequest {
  readonly sampleIds?: readonly string[];
}

export interface CollectionDetectorBatchVerdict {
  readonly detectorId: string;
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly latencyMs: number;
}

export interface CollectionDetectorBatchSampleResult {
  readonly sampleId: string;
  readonly title: string;
  readonly status: 'ok' | 'failed' | 'skipped';
  readonly detected?: boolean;
  readonly confidence?: number;
  readonly latencyMs?: number;
  readonly verdicts?: readonly CollectionDetectorBatchVerdict[];
  readonly reason?: string;
}

export interface CollectionDetectorBatchRunOutcome {
  readonly runId: string;
  readonly status: 'completed' | 'rejected';
  readonly inputHash: string;
  readonly aggregate: {
    readonly total: number;
    readonly ok: number;
    readonly failed: number;
    readonly skipped: number;
    readonly detected: number;
    readonly latencyP50Ms: number;
    readonly latencyP95Ms: number;
  };
  readonly results: readonly CollectionDetectorBatchSampleResult[];
  readonly rejection: {
    readonly reason: 'empty' | 'reader-failed' | 'detector-unavailable' | 'limit-exceeded';
    readonly detail: string;
  } | null;
}

export interface PaginatedSamples<T = MediaSample> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Заказ отбора чарт-листа по текущему набору (#2110). Даты — ISO-строки: пояс человека
 * замораживается на клиенте, сервер и ядро о поясах не знают.
 */
export interface LibraryChartListRequest {
  volume: number;
  criterion: string;
  /** Начало промежутка, ISO, включительно. */
  from?: string;
  /** Конец промежутка, ISO, включительно. */
  to?: string;
}

/** Заказ плана уборки буфера (#2204): принцип и объём — из словаря плагина. */
export interface BufferCleanupPlanRequest {
  principle: 'oldest' | 'newest';
  volume: number;
}

/** Строка плана: что именно уйдёт. Человек видит её ДО подтверждения. */
export interface BufferCleanupPlanRow {
  id: string;
  title: string;
  createdAt: string;
  sizeBytes: number;
}

/** Ответ плана уборки: список, защищённые с причинами и числа. */
export interface BufferCleanupPlanOutcome {
  principle: 'oldest' | 'newest';
  requested: number;
  doomed: readonly BufferCleanupPlanRow[];
  protectedOut: readonly { id: string; title: string; why: string }[];
  freedBytes: number;
  remaining: number;
  inBuffer: number;
  /** Не null — набралось меньше запрошенного; показывать обязательно. */
  shortfall: string | null;
}

/**
 * Итог удаления по списку: сколько ушло, сколько освободилось и кого не тронули — с причинами.
 *
 * ЧАСТИЧНЫЙ ОТКАЗ — НЕСУЩЕЕ СВОЙСТВО, а не крайний случай: часть списка может уйти, часть
 * отказать, и отказ обязан называть записи ПОИМЁННО. Проверено живым смоуком 29.08:
 * пять удалено, трём отказано с причиной у каждой.
 */
export interface DeleteByIdsOutcome {
  deleted: number;
  freedBytes: number;
  refused: readonly { id: string; why: string }[];
}

/**
 * Причина, по которой проба осталась в буфере при массовом вывозе. Закрытый набор — окно
 * разбирает исход по нему, а не по тексту.
 *
 * `no-space` — ось набора не вмещает; `not-found` — такой пробы у прибора нет;
 * `not-in-buffer` — проба уже не в буфере (в том числе после удачного прошлого вызова).
 */
export type MoveBatchStayReason = 'no-space' | 'not-found' | 'not-in-buffer';

export interface MoveBatchStay {
  sampleId: string;
  reason: MoveBatchStayReason;
}

/** Числа пачки: сколько поместится/останется и сколько это байт. */
export interface MoveBatchPlan {
  willMove: number;
  willStay: number;
  moveBytes: number;
  stayBytes: number;
}

/**
 * Итог массового вывоза проб из буфера в набор.
 *
 * ЧАСТИЧНЫЙ ПЕРЕНОС — НЕСУЩЕЕ СВОЙСТВО, а не крайний случай: набор младшего тарифа держит
 * столько же, сколько буфер, и полный буфер в непустой набор целиком не влезает по устройству
 * тарифа. Непустой `stayed` — это штатный исход, и каждая оставшаяся названа ПОИМЁННО.
 *
 * При `dryRun` `moved` пуст, а `plan` — то, что вышло БЫ: это и есть то, что окно показывает
 * человеку до подтверждения («перенесётся 740 из 1057»). Оси — состояние на конец вызова.
 *
 * `maxBatch` — объявленный сервером потолок списка за вызов; листать по нему, а не угадывать
 * предел по первому отказу.
 */
export interface MoveBatchOutcome {
  plan: MoveBatchPlan;
  moved: readonly string[];
  stayed: readonly MoveBatchStay[];
  userStorage: { usedBytes: number; limitBytes: number };
  buffer: { usedBytes: number; limitBytes: number };
  maxBatch: number;
}

/** Заказ свода сеанса (#2039): ночь — промежутком дат в поясе человека, ISO включительно. */
export interface SessionDigestRequest {
  from?: string;
  to?: string;
}

/** Заказ поиска дублей в наборе (#2109): только окно; ручек порога у человека нет намеренно. */
export interface LibraryDuplicatesRequest {
  from?: string;
  to?: string;
}

/** Опорный (или негативный) звук свода — адрес пробы и что о нём измерено. */
export interface SessionDigestSound {
  sampleId: string;
  title: string;
  startSec: number;
  endSec: number;
  peakDb: number;
  durationSec: number;
  structure: 'tonal' | 'broadband';
  similarDropped: number;
}

export interface SessionDigestRunOutcome {
  runId: string;
  kind: 'report';
  window: { from?: string; to?: string; tracksSeen: number; tracksInWindow: number };
  floor: { value: number; measured: boolean };
  /** Опорные образы — тональные; негативы — широкополосные, не выброшены. */
  references: SessionDigestSound[];
  negatives: SessionDigestSound[];
  shortfall: { references: number; negatives: number };
  eventsFound: number;
  /** Паспорт: чем считали, и какие пороги слух ещё не называл — поимённо. */
  passport: {
    frameSize: number;
    deltaDb: number;
    minDistanceRatio: number;
    flatnessCeiling: number;
    referencesLimit: number;
    negativesLimit: number;
    provisional: string[];
  };
  refusal: { reason: string; detail: string } | null;
}

/** Адрес похожей пробы, как его отдаёт витрина media (с моментом — соседство по времени слышно первым). */
export interface LibraryDuplicateRef {
  entryId: string;
  sampleId: string;
  at: number;
  deltaDb: number;
  peakDb: number;
  structure: 'tonal' | 'broadband';
  flatness: number;
}

export interface LibraryDuplicateGroup {
  keeper: LibraryDuplicateRef;
  duplicates: LibraryDuplicateRef[];
}

export interface LibraryDuplicatesRunOutcome {
  runId: string;
  report: {
    groups: LibraryDuplicateGroup[];
    candidatesSeen: number;
    duplicatesFound: number;
    /** Порог числом и словом «унаследован» — панель обязана показать это рядом с парами. */
    passport: { minDistanceRatio: number; inherited: true };
    refusal: { reason: string; detail: string } | null;
  };
  inSet: number;
  inWindow: number;
  measured: number;
}

/** Строка выборки, как её отдаёт витрина media. */
export interface LibraryChartListPick {
  entryId: string;
  sampleId: string;
  rank: number;
  deltaDb: number;
  peakDb: number;
  structure: string;
  flatness: number;
  displaced: number;
}

export interface LibraryChartListRefusal {
  reason: string;
  detail: string;
}

/** Исход прогона витрины: выборка + честные счётчики набора/окна/измеренного. */
export interface LibraryChartListRunOutcome {
  runId: string;
  selection: {
    criterion: string;
    volume: number;
    picks: LibraryChartListPick[];
    shortfall: number;
    refusal: LibraryChartListRefusal | null;
  };
  inSet: number;
  inWindow: number;
  measured: number;
}
