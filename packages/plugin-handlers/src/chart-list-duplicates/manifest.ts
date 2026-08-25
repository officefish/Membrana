/**
 * Манифест витрины дублей набора — третий показ семейства чарт-листа (#2109, b2).
 *
 * СЕМЕЙСТВО, А НЕ КОПИЯ. Мера похожести одна (`../session-metrics`), ядро пар одно
 * (`../chart-list/duplicates.ts`), измеритель один (`../chart-list-measure`). Этот манифест
 * даёт семейству показ ДРУГОГО вопроса: не «кто попал в выборку», а «кто на кого похож во
 * ВСЁМ наборе». Отбор оставляет двадцать; чистка называет каждую пару.
 *
 * ДОМ — `background-media/collections`, как у витрины отбора: похожесть считается там, где
 * лежит звук набора, и `RunAddress.collectionId` есть адрес набора. Новых домов и контрактов
 * не заводится (Т6 шторма 22.08).
 *
 * РОД — `showcase`: пары существуют ради показа человеку, который решает. Витрина НЕ удаляет
 * ничего: слово владельца 23.08 — цена ошибки у выбора и у стирания разная, порог унаследован
 * без перепроверки, потому показ и ожидание слова, а не приговор.
 *
 * ПОВОД — `collections.collection_created` из закрытого словаря M4: набор принадлежит
 * коллекции, о ней и повод. Канал `request`: человек жмёт «найти дубли» в библиотеке.
 *
 * ФОРМА ПОКАЗА — `table`: группа «представитель + похожие» есть список строк.
 */
import type { PluginId, ShowcaseManifest } from '@membrana/plugin-contracts';

export const LIBRARY_DUPLICATES_MANIFEST: ShowcaseManifest = {
  id: 'membrana.showcase.library-duplicates' as PluginId,
  version: '0.1.0',
  kind: 'showcase',
  mountTarget: 'background-media/collections',
  triggers: ['collections.collection_created'],
  displayForm: 'table',
  description: 'Пары похожих проб текущего набора — показать и ждать слова, не удалять',
};

export const LIBRARY_DUPLICATES_ID = LIBRARY_DUPLICATES_MANIFEST.id;
