/**
 * Дома крепления — M2_VERDICT (#1961). Первая очередь — два, длинной формой `<пакет>/<домен>`.
 * Устройства отложены до появления Nest-модуля `background-devices` — не «сейчас», не «никогда».
 *
 * Добавление дома — PR в этот пакет при существующем Nest-модуле. Манифест с
 * `mountTarget ∉ HOME_REGISTRY` отвергается валидацией до рантайма — этим и занят
 * `isHomeName`.
 */
export const HOME_REGISTRY = {
  'background-office/journal': { package: 'background-office', domain: 'journal' },
  'background-media/collections': { package: 'background-media', domain: 'collections' },
} as const;

export type HomeName = keyof typeof HOME_REGISTRY;

export function isHomeName(value: unknown): value is HomeName {
  return typeof value === 'string' && Object.hasOwn(HOME_REGISTRY, value);
}

/**
 * Дом результатов — M3 (непереигрываемое) с уточнением аудита A3-6: константы лежат В ПАКЕТЕ
 * рядом с `HOME_REGISTRY`, а не внутри него — реестр перечисляет дома КРЕПЛЕНИЯ, а коллекция
 * результатов домом крепления не является.
 */
export const PLUGIN_RESULTS_DB = 'background-office';
export const PLUGIN_RESULTS_COLLECTION = 'plugin-results';
