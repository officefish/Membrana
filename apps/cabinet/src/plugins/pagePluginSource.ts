/**
 * Источник включённости жильцов страницы (#2177).
 *
 * ЗАЧЕМ ПАРАМЕТР, А НЕ ЖЁСТКИЙ ИМПОРТ. `useHomePagePlugins` звал `/v1/telemetry/plugins`
 * напрямую — журнальный дом. Библиотека живёт в другом доме (`background-media/collections`),
 * и второй раскладки заводить нельзя: механизм страниц объявлен общим («компонент не знает,
 * чья он страница»). Общим он остаётся ровно до тех пор, пока источник состояния — параметр.
 *
 * ДВА ИСТОЧНИКА, И ОНИ НЕ РАВНЫ — это надо знать, а не сглаживать.
 *
 * `homePluginSource` — журнальный: владелец включённости ДОМ. Дом выключенного не зовёт и на
 * запрос по нему бросает; страница лишь отражает подтверждённое сервером.
 *
 * `localPluginSource` — библиотечный: владелец включённости СТРАНИЦА. У media нет входа
 * списка плагинов и нет переключения — замерено 26.08: у контроллера коллекций один `@Get`
 * (сами коллекции) и `POST …/plugins/:pluginId/request`, списка и PATCH нет. Заводить их —
 * серверный контракт, а не доводка раскладки, и делать это молча в UI-шоте нельзя.
 *
 * Цена расхождения названа честно: в библиотеке тумблер решает ПОКАЗ виджета, но не мешает
 * дому исполнить прогон, если его попросят иным путём. В журнале — мешает. Когда у media
 * появится вход включённости, библиотека переедет на `homePluginSource` заменой одной строки.
 */
import { fetchJournalPlugins, setJournalPluginEnabled } from '@/api/journal';

import type { HomePluginState } from './adapters/manifestToPagePlugin';

export interface PagePluginSource {
  readonly list: () => Promise<readonly HomePluginState[]>;
  readonly setEnabled: (pluginId: string, enabled: boolean) => Promise<void>;
}

/** Журнальный дом: включённость держит сервер. */
export const homePluginSource: PagePluginSource = {
  list: async () => (await fetchJournalPlugins()) as readonly HomePluginState[],
  setEnabled: setJournalPluginEnabled,
};

/**
 * Местный источник: список жильцов объявляет страница, включённость держит она же.
 *
 * Начальное положение галочек — параметр, а не догадка: библиотека включает жильцов сразу,
 * иначе владелец, открыв страницу, увидел бы пустое место там, где вчера была панель.
 */
export function localPluginSource(
  states: readonly HomePluginState[],
): PagePluginSource {
  let current = states;
  return {
    list: async () => current,
    setEnabled: async (pluginId, enabled) => {
      current = current.map((p) => (p.manifest.id === pluginId ? { manifest: p.manifest, enabled } : p));
    },
  };
}
