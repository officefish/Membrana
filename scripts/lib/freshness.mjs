/**
 * Свежесть источников холодной сессии — чистые функции (#1416 Ф0/Ф1).
 *
 * Прецедент 2026-07-29 (класс cold-start, третий): холодная сессия озвучила
 * картину из кеша (память 24.07 + локальное дерево 26.07) как «сегодня»; дыра
 * 27–28.07 была невидима. Общая форма класса: кеш без даты пожирает актуальность.
 * Свежесть точки входа определяет origin/main, не локальное дерево — значит любой
 * штамп обязан нести дату источника, а разрыв локальное↔origin считаться в днях.
 *
 * Модуль намеренно без IO: git/fs живут в потребителях (cold-start-stamps.mjs,
 * hermes-brief.mjs), сюда — только детерминированные расчёты, покрываемые тестами.
 */

/**
 * Календарный день ISO-штампа: `2026-07-29T07:46:10+03:00` → `2026-07-29`.
 * Берём локальную дату источника (до `T`), НЕ конвертируем в UTC: дыра меряется
 * в «рабочих днях календаря», и коммит 00:30 по Москве — это его день, не вчера.
 */
export function isoDay(iso) {
  const m = String(iso ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * Дата из заголовка HANDOFF: первая `YYYY-MM-DD` в первой H1-строке
 * (`# HANDOFF → 2026-07-28 · …`). Нет H1 или даты в нём → null (потребитель
 * падает на mtime файла или на дату коммита).
 */
export function parseHandoffHeaderDate(md) {
  if (!md) return null;
  const h1 = String(md)
    .split(/\r?\n/)
    .find((l) => /^#\s/.test(l));
  const m = h1?.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * Дыра в целых днях между двумя календарными датами (`YYYY-MM-DD`):
 * положительное значение = `newer` свежее `older` (локальное дерево отстало).
 * Любая невалидная дата → null (не 0: «неизвестно» ≠ «свежо»).
 */
export function gapDays(older, newer) {
  const a = Date.parse(`${isoDay(older)}T00:00:00Z`);
  const b = Date.parse(`${isoDay(newer)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** Русское склонение дней: 1 день, 2 дня, 5 дней, 11 дней, 21 день. */
export function ruDays(n) {
  const abs = Math.abs(n);
  const d10 = abs % 10;
  const d100 = abs % 100;
  if (d10 === 1 && d100 !== 11) return `${n} день`;
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return `${n} дня`;
  return `${n} дней`;
}

/**
 * Итоговая дыра локальное↔origin: приоритет — даты HANDOFF (боль 29.07 именно
 * про устаревшую точку входа), фолбэк — даты tip-коммитов. Обе пары неполны →
 * null. Возвращает { days, basis: 'handoff'|'tip' } либо null.
 */
export function pickFreshnessGap({ localHandoffDate, originHandoffDate, localTipDay, originTipDay }) {
  const byHandoff = gapDays(localHandoffDate, originHandoffDate);
  if (byHandoff != null) return { days: byHandoff, basis: 'handoff' };
  const byTip = gapDays(localTipDay, originTipDay);
  if (byTip != null) return { days: byTip, basis: 'tip' };
  return null;
}
