/** Плагин отбора чарт-листа в библиотеке (#2110) — четвёртая панель ряда. */

export const SAMPLE_LIBRARY_CHART_LIST_PLUGIN_ID = 'sample-library-chart-list';

export interface SampleLibraryChartListPluginConfig {
  /** Пусто намеренно: настройки отбора — состояние ПАНЕЛИ на один прогон, не конфиг плагина. */
  readonly [key: string]: never;
}

export const defaultSampleLibraryChartListConfig: SampleLibraryChartListPluginConfig = {};

/**
 * Перевод дат живёт в общем ядре близнецов — `@membrana/media-library-service` (#2110):
 * Studio и кабинет обязаны считать день человека одинаково, и две копии правила
 * разъехались бы молча. Реэкспорт оставлен, чтобы соседи панели не меняли импортов.
 */
export { dateInputToIsoWindow } from '@membrana/media-library-service';
