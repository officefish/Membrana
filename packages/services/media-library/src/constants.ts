/** Fixed collection ids — see docs/MEDIA_LIBRARY_ARCHITECTURE.md */
export const BUFFER_COLLECTION_ID = '__buffer__';
/** Read-only system dataset provisioned per tariff (bundled + server). */
export const TARIFF_DATASET_COLLECTION_ID = '__tariff_dataset__';
export const TARIFF_DATASET_SYSTEM_KEY = 'tariff-dataset' as const;
/**
 * Человеческое имя системного набора. Идентификатора тарифа в нём НЕТ (#2561): назначенный
 * каталог живёт в `Device.datasetCatalogId` и едет в `/quota`, имя про него молчит — иначе после
 * смены тарифа одна из двух надписей обязательно лжёт. Сервер записей и Studio держат копии
 * (shell не импортирует сервис в main, сервер записей не читает констант библиотеки).
 */
export const TARIFF_DATASET_COLLECTION_NAME = 'Базовый набор';
/** Default catalog for free-v1 tariff (120 × 5s samples). */
export const FREE_V1_CATALOG_ID = 'free-v1-catalog';

export const DEFAULT_LOCAL_QUOTA_BYTES = 100 * 1024 * 1024;
/** Count cap for `__buffer__` — only enforced in browser-limited-fallback (BL1). */
export const DEFAULT_MAX_BUFFER_SAMPLES = 10;
/** Matches `background-media` sample list pagination default. */
export const DEFAULT_SAMPLES_PAGE_SIZE = 40;

export const DEFAULT_MEDIA_LIBRARY_CONFIG = {
  localQuotaBytes: DEFAULT_LOCAL_QUOTA_BYTES,
  maxBufferSamples: DEFAULT_MAX_BUFFER_SAMPLES,
} as const;

export type MediaLibraryConfig = typeof DEFAULT_MEDIA_LIBRARY_CONFIG;
