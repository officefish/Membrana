/** Плагин отбора чарт-листа в библиотеке (#2110) — четвёртая панель ряда. */

export const SAMPLE_LIBRARY_CHART_LIST_PLUGIN_ID = 'sample-library-chart-list';

export interface SampleLibraryChartListPluginConfig {
  /** Пусто намеренно: настройки отбора — состояние ПАНЕЛИ на один прогон, не конфиг плагина. */
  readonly [key: string]: never;
}

export const defaultSampleLibraryChartListConfig: SampleLibraryChartListPluginConfig = {};

/**
 * Перевод дат из `<input type="date">` в ISO-границы промежутка — В ПОЯСЕ ЧЕЛОВЕКА.
 *
 * Ядро отбора о поясах не знает (оно едино для сервера и клиента), поэтому пояс замораживается
 * здесь: «22.08» для человека — от его local-полуночи до его local-23:59:59.999, и обе границы
 * включительны. `new Date('2026-08-22')` не годится: строка без времени читается как UTC, и для
 * человека восточнее Гринвича день начался бы вчера вечером.
 */
export function dateInputToIsoWindow(fromDate: string, toDate: string): { from?: string; to?: string } {
  const out: { from?: string; to?: string } = {};
  if (/^\d{4}-\d{2}-\d{2}$/u.test(fromDate)) {
    const [y, m, d] = fromDate.split('-').map(Number);
    out.from = new Date(y!, m! - 1, d!, 0, 0, 0, 0).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}$/u.test(toDate)) {
    const [y, m, d] = toDate.split('-').map(Number);
    out.to = new Date(y!, m! - 1, d!, 23, 59, 59, 999).toISOString();
  }
  return out;
}
