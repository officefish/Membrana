/**
 * Поводы — M4_VERDICT с эрратумом (#1961). Закрытый юнион из const-объекта; форма имени
 * `<дом>.<событие>`; произвольные строки исключены. Расширение — через этот пакет с вердиктом
 * комнаты или ADR.
 *
 * Один словарь на оба режима Т2: живой (`notify`) и постфактум (`request`) различаются каналом
 * дома, плагин канала не знает — потому в словаре нет и не будет `deliveryMode`.
 *
 * `journal.entry_created` — будущая точка: испускание домом журнала — после снятия отложенной
 * цены Т3.7, не в этом собрании. В словаре оно есть, чтобы имя было занято вердиктом, а не
 * придумано первым испускающим.
 */
export const PLUGIN_TRIGGERS = {
  JOURNAL_ENTRY_CREATED: 'journal.entry_created',
  COLLECTIONS_COLLECTION_CREATED: 'collections.collection_created',
  COLLECTIONS_SAMPLE_ADDED: 'collections.sample_added',
} as const;

export type PluginTrigger = (typeof PLUGIN_TRIGGERS)[keyof typeof PLUGIN_TRIGGERS];

const TRIGGER_VALUES: ReadonlySet<string> = new Set(Object.values(PLUGIN_TRIGGERS));

export function isPluginTrigger(value: unknown): value is PluginTrigger {
  return typeof value === 'string' && TRIGGER_VALUES.has(value);
}
