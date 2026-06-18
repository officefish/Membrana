/** Mirrors @membrana/media-library-service constants (shell must not import service in main). */
export const BUFFER_COLLECTION_ID = '__buffer__';
export const TARIFF_DATASET_COLLECTION_ID = '__tariff_dataset__';
export const TARIFF_DATASET_SYSTEM_KEY = 'tariff-dataset' as const;
export const DEFAULT_SAMPLES_PAGE_SIZE = 40;
/** Soft quota for desktop FS (~50 GiB). */
export const DEFAULT_ELECTRON_QUOTA_BYTES = 50 * 1024 * 1024 * 1024;
