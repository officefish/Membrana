/**
 * Манифест измерителя чарт-листа. Блок c5b спринта `chart-list-plugin`.
 *
 * ВТОРОЙ ПЛАГИН ОДНОГО ФУНКЦИОНАЛА — ровно то, что описывает Т6 шторма 22.08: обособление несёт
 * ПАКЕТ, а множественное внедрение делается несколькими плагинами с общим сервисом. Отбор
 * чарт-листа — один функционал; у него два внедрения:
 *
 *   • `membrana.showcase.chart-list`  → дом журнала кабинета: спрашивает человека и показывает;
 *   • `membrana.report.chart-list-measure` → дом коллекций media: меряет там, где лежит звук.
 *
 * Т2 ЭТИМ НЕ НАРУШЕН. Т2 запрещает дробить НАСТРОЙКИ на плагины: объём и критерий — две настройки
 * одного плагина, и они обе у чарт-листа. Измеритель настроек человеку не показывает и в сайдбаре
 * не появляется — он не второй выбор, а второй конец одного провода.
 *
 * РОД — `report`. Свод по НАБОРУ проб, а не поток по каждой: `handler` требует `windowSize`, и
 * выдумывать ему смысл для перечня пришлось бы силой. Тот же довод, по которому родом `report`
 * стал свод сеанса.
 *
 * ПОВОД — `collections.collection_created` из ЗАКРЫТОГО словаря M4. Канал здесь `request`, и повод
 * в нём — АДРЕС ПРИЧИНЫ, а не отметка момента: набор проб принадлежит коллекции, о ней и повод.
 * `sample_added` не подходит: он несёт ОДНУ пробу, а измеряется перечень.
 */
import type { PluginId, ReportManifest } from '@membrana/plugin-contracts';

export const CHART_LIST_MEASURE_MANIFEST: ReportManifest = {
  id: 'membrana.report.chart-list-measure' as PluginId,
  version: '0.1.0',
  kind: 'report',
  mountTarget: 'background-media/collections',
  triggers: ['collections.collection_created'],
};

export const CHART_LIST_MEASURE_ID = CHART_LIST_MEASURE_MANIFEST.id;
