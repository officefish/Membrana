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
