/**
 * Манифест чарт-листа. Блок c3 спринта `chart-list-plugin`.
 *
 * РОД — `showcase`, и это единственный род, который страница вообще показывает: у `handler` и
 * `report` нет `displayForm`, рисовать их нечем. Чарт-лист существует ради показа человеку —
 * значит витрина, а не свод и не поток.
 *
 * ДОМ — `background-cabinet/journal`. Имя завела почва (коворк `cowork-server-plugin-pages`),
 * поведение за именем — журнал кабинета. Чужой `mountTarget` дом отвергнет при регистрации.
 *
 * ПОВОД — `journal.entry_created`, единственный журнальный в ЗАКРЫТОМ словаре M4. Расширять
 * словарь нельзя, и заводить «chart_list.requested» было бы именно расширением. Оговорка та же,
 * что у свода: канал здесь `request`, и повод в нём — АДРЕС ПРИЧИНЫ, а не отметка момента.
 * Человек жмёт кнопку, отбор идёт по записям ленты — причиной служит появление записи в ленте.
 *
 * ФОРМА ПОКАЗА — `table`. Чарт-лист есть СПИСОК строк, и `table` — единственная форма списка,
 * которую страница журнала умеет: `SUPPORTED_FORMS` объявлены в `apps/cabinet/src/plugins/
 * pagePlugins.ts`, и здесь на них ССЫЛАЮТСЯ, а не копируют — две копии списка форм разъехались бы
 * молча. `row` не подходит: это форма ОДНОЙ строки, а не перечня.
 *
 * ПРАВОК `@membrana/plugin-contracts` НЕТ и не требуется — прямое следствие Т6 шторма 22.08:
 * обособление функционала несёт пакет, а не запись в реестре.
 */
import type { PluginId, ShowcaseManifest } from '@membrana/plugin-contracts';

export const CHART_LIST_MANIFEST: ShowcaseManifest = {
  id: 'membrana.showcase.chart-list' as PluginId,
  version: '0.1.0',
  kind: 'showcase',
  mountTarget: 'background-cabinet/journal',
  triggers: ['journal.entry_created'],
  displayForm: 'table',
  description: 'Отбор звуков журнала по объёму выборки и критерию',
};

export const CHART_LIST_ID = CHART_LIST_MANIFEST.id;
