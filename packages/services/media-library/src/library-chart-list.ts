/**
 * Общее ядро панели отбора для ОБОИХ близнецов — Studio и кабинета (#2110).
 *
 * Слово владельца 24.08: библиотека сэмплов в Studio и в кабинете — близнецы, всё, что умеет
 * одна, обязана уметь другая, и новую возможность планировать двумя блоками с ОБЩИМ ядром в
 * `packages/`. Здесь то, что у панели не зависит от приложения: словари настроек и перевод
 * дат человека в границы окна. Сами панели в приложениях — тонкие: заказ у сервера и показ.
 */

/** Объёмы выборки — закрытый список из заказа владельца; тот же, что у ядра отбора. */
export const LIBRARY_CHART_LIST_VOLUMES = [20, 60, 100, 200] as const;

/** Критерии с человеческими именами: что меряется, а не как рисуется. */
export const LIBRARY_CHART_LIST_CRITERIA = [
  { value: 'loudness-over-floor', title: 'Громче фона' },
  { value: 'spectral-variety', title: 'Разнообразие звука' },
  { value: 'drone-likeness', title: 'Похожесть на дрон' },
] as const;

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
