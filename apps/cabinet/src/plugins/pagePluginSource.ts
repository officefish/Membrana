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
 * Домовый список ПЛЮС местные жильцы (#2204).
 *
 * ЗАЧЕМ. Управление буфером живёт в доме media (буфер есть набор, там же лежит звук), а
 * показать его надо и на странице журнала. Журнальный хост чужого жильца не примет и не
 * должен: он проверяет `mountTarget` и откажет — жилец принадлежит одному дому, это правило
 * архитектуры, а не помеха. Регистрировать его в журнале «ради тумблера» значило бы завести
 * жильца, за которым дом ничего не исполняет, — ровно тот мёртвый регулятор, от которого
 * журнальный контроллер отказался, не отдав наружу `request`.
 *
 * ЧТО ЗДЕСЬ ПРОИСХОДИТ. Страница берёт у своего дома его жильцов и добавляет к ним местных —
 * тех, чей дом другой. Включённость домовых держит дом, включённость местных держит страница.
 * Разница названа, а не сглажена: тумблер местного жильца решает ПОКАЗ виджета и ничего не
 * говорит чужому дому.
 */
export function withLocalTenants(
  source: PagePluginSource,
  tenants: readonly HomePluginState[],
): PagePluginSource {
  let local = tenants;
  return {
    list: async () => {
      const home = await source.list();
      // Домовые впереди: порядок жильцов назначает дом, местные пристраиваются следом.
      return [...home, ...local];
    },
    setEnabled: async (pluginId, enabled) => {
      const isLocal = local.some((p) => p.manifest.id === pluginId);
      if (isLocal) {
        local = local.map((p) => (p.manifest.id === pluginId ? { manifest: p.manifest, enabled } : p));
        return;
      }
      await source.setEnabled(pluginId, enabled);
    },
  };
}

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
