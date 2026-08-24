/**
 * Манифест отбора в библиотеке сэмплов — второй ПОКАЗ семейства чарт-листа (#2110).
 *
 * СЕМЕЙСТВО, А НЕ КОПИЯ. Ядро отбора одно (`../chart-list/selection.ts`), меры одни
 * (`../session-metrics`), измеритель один (`../chart-list-measure`). Этот манифест добавляет
 * семейству второй дом показа: журнальная витрина живёт в кабинете и отбирает по ленте, эта —
 * в библиотеке клиента и отбирает по ТЕКУЩЕМУ НАБОРУ. Журнальный манифест не тронут — слово
 * владельца 24.08: дополняем, не переносим.
 *
 * ДОМ — `background-media/collections`, уже в HOME_REGISTRY: отбор идёт там, где лежит звук
 * набора. `RunAddress.collectionId` и есть адрес текущего набора — выбран буфер, работаем с
 * буфером; пользовательский сет — с ним. Никакой второй адресации не заводится.
 *
 * РОД — `showcase`: существует ради показа человеку, как и журнальная витрина. Отличие от
 * соседа-измерителя (`report`) несущее: измеритель отдаёт ВСЕХ измеренных без порядка, витрина
 * отвечает «кто попал и в каком порядке» по настройкам человека.
 *
 * ПОВОД — `collections.collection_created` из закрытого словаря M4: набор проб принадлежит
 * коллекции, о ней и повод. Канал `request`, повод в нём — адрес причины, не отметка момента:
 * человек жмёт кнопку в библиотеке, отбор идёт по пробам коллекции.
 *
 * ФОРМА ПОКАЗА — `table`: выборка есть список строк, та же форма, что у журнальной витрины.
 */
import type { PluginId, ShowcaseManifest } from '@membrana/plugin-contracts';

export const LIBRARY_CHART_LIST_MANIFEST: ShowcaseManifest = {
  id: 'membrana.showcase.library-chart-list' as PluginId,
  version: '0.1.0',
  kind: 'showcase',
  mountTarget: 'background-media/collections',
  triggers: ['collections.collection_created'],
  displayForm: 'table',
  description: 'Отбор звуков текущего набора библиотеки по объёму, критерию и промежутку дат',
};

export const LIBRARY_CHART_LIST_ID = LIBRARY_CHART_LIST_MANIFEST.id;
