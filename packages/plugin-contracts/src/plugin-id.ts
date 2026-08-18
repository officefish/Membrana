/**
 * Имя плагина — `<org>.<kind>.<slug>`. Авторитет: M1_VERDICT (#1961).
 *
 * Второй сегмент — РОД плагина (`handler` | `report` | `showcase`), НЕ модуль и не дом:
 * дом крепления живёт в `mountTarget` манифеста и в `RunAddress` явным полем (M3′,
 * находки A3-1/A3-2), и кодировать его в имени запрещено. Пример: `membrana.handler.mfcc`.
 *
 * Branded-тип: сырая строка в сигнатуры хоста не проходит (`request(pluginId: PluginId, …)`,
 * эрратум A4-2), потому что «строка, похожая на имя» и «имя, прошедшее валидатор» — разные
 * состояния, и первое не должно молча притворяться вторым.
 */
declare const pluginIdBrand: unique symbol;

export type PluginId = string & { readonly [pluginIdBrand]: 'PluginId' };

/** Regex M1 дословно. Три сегмента через точку; дефис допустим со второго сегмента. */
export const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$/u;

export function isPluginId(value: unknown): value is PluginId {
  return typeof value === 'string' && PLUGIN_ID_PATTERN.test(value);
}
