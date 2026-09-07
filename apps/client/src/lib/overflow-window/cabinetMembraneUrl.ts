import { getCabinetApiBase } from '@/api/pairing';

/**
 * Дорога 3 — «Сменить тариф» ведёт в кабинет на страницу мембраны (#2286).
 *
 * Кабинет открывается на разделе «Мембрана» по умолчанию (`CabinetShell.DEFAULT_SECTION`),
 * отдельного пути у раздела нет — поэтому адрес = корень кабинета. Корень берём из той же
 * настройки, что и API кабинета (`VITE_CABINET_API_URL`, по умолчанию `cabinet.membrana.space`):
 * на проде UI и API кабинета живут на одном origin. В dev, где API вынесен на другой порт,
 * ссылка укажет на API — назвать это в докладе, не прятать.
 */
export function resolveCabinetMembraneUrl(): string {
  return `${getCabinetApiBase()}/`;
}
