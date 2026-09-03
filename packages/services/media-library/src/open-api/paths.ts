/**
 * Адресация наружу СОХРАНЯЕТ внутренние пути без слоя трансляции (вердикт M2).
 *
 * `deviceId` — технический ключ прибора, `collectionId` — группировка; единицу владения из
 * M1 (`Device.membraneId`) это не трогает и не подменяет.
 */

/** Ключ пробы во ВСЕХ ссылках. Изменяемый `title` ключом быть не может. */
export const SAMPLE_KEY_PARAM = 'sampleId';

/** Параметр, которому в адресах места нет: `title` переименовывается человеком. */
export const FORBIDDEN_PATH_PARAM = 'title';

export const COLLECTIONS_PATH_TEMPLATE = '/v1/devices/{deviceId}/collections';
export const SAMPLES_PATH_TEMPLATE = '/v1/devices/{deviceId}/collections/{collectionId}/samples';
export const SAMPLE_BLOB_PATH_TEMPLATE = '/v1/devices/{deviceId}/samples/{sampleId}/blob';

export const LIBRARY_PATH_TEMPLATES = [
  COLLECTIONS_PATH_TEMPLATE,
  SAMPLES_PATH_TEMPLATE,
  SAMPLE_BLOB_PATH_TEMPLATE,
] as const;

export type LibraryPathTemplate = (typeof LIBRARY_PATH_TEMPLATES)[number];

export function collectionsPath(deviceId: string): string {
  return `/v1/devices/${encodeURIComponent(deviceId)}/collections`;
}

export function samplesPath(deviceId: string, collectionId: string): string {
  return `${collectionsPath(deviceId)}/${encodeURIComponent(collectionId)}/samples`;
}

/**
 * Тело пробы адресуется `sampleId`. Строится функцией, а не конкатенацией на стороне
 * читателя, чтобы «ключ = id» держался кодом, а не памятью.
 */
export function sampleBlobPath(deviceId: string, sampleId: string): string {
  return `/v1/devices/${encodeURIComponent(deviceId)}/samples/${encodeURIComponent(sampleId)}/blob`;
}

/** Имена шаблонных параметров пути — для зуба «ключ во всех ссылках». */
export function pathTemplateParams(template: string): string[] {
  return [...template.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] ?? '');
}
