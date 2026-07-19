/**
 * RT-9: гвард свежести артефактов ритуала.
 * dateOf — из HTML-комментария «Сгенерировано:», не mtime (недетерминирован при checkout).
 */

/** @param {string} text */
export function dateOf(text) {
  if (!text) return null;
  // <!-- Сгенерировано: 2026-07-18T03:23:26.803Z (yarn code-review) -->
  const m = String(text).match(/<!--\s*Сгенерировано:\s*(\d{4}-\d{2}-\d{2})/u);
  return m ? m[1] : null;
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} deltaDays
 */
export function addCalendarDays(isoDate, deltaDays) {
  const [y, mo, d] = isoDate.split('-').map(Number);
  const utc = Date.UTC(y, mo - 1, d) + deltaDays * 86_400_000;
  return new Date(utc).toISOString().slice(0, 10);
}

/**
 * Целые календарные дни: today - dateOf (0 = сегодня, 1 = вчера).
 * @param {string} text
 * @param {string} today YYYY-MM-DD
 * @returns {number|null} null если штампа нет
 */
export function ageDays(text, today) {
  const stamped = dateOf(text);
  if (!stamped) return null;
  const t0 = Date.parse(`${stamped}T00:00:00.000Z`);
  const t1 = Date.parse(`${today}T00:00:00.000Z`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return Math.round((t1 - t0) / 86_400_000);
}

/** Строго: штамп == today (консилиум A1, чистая функция). */
export function isFresh(text, today) {
  return dateOf(text) === today;
}

/**
 * Вход утреннего ритуала: вчерашнее вечернее ревью (age 0 или 1).
 * @param {string} text
 * @param {string} today
 * @param {number} [maxAgeDays=1]
 */
export function isAcceptableReviewAge(text, today, maxAgeDays = 1) {
  const age = ageDays(text, today);
  return age != null && age >= 0 && age <= maxAgeDays;
}

/**
 * @param {string} text
 * @param {{today:string, label?:string, maxAgeDays?:number, exitCode?:number}} opts
 */
export function assertReviewInputFresh(text, opts) {
  const { today, label = 'DAILY_CODE_REVIEW.md', maxAgeDays = 1, exitCode = 2 } = opts;
  const stamped = dateOf(text);
  if (!stamped) {
    const err = new Error(
      `[freshness] ${label}: нет штампа «Сгенерировано:» — нельзя проверить свежесть (RT-9)`,
    );
    err.exitCode = exitCode;
    throw err;
  }
  const age = ageDays(text, today);
  if (age != null && age >= 0 && age <= maxAgeDays) return { stamped, age };
  const human =
    age == null
      ? 'дата неразборчива'
      : age < 0
        ? `штамп в будущем (${stamped} > ${today})`
        : `устарел на ${age} дн. (штамп ${stamped}, сегодня ${today}, допуск ≤${maxAgeDays})`;
  const err = new Error(`[freshness] ${label}: ${human}`);
  err.exitCode = exitCode;
  throw err;
}

/**
 * Шаги ritual:evening, которым позволен soft-fail (`|| true`).
 * Всё остальное падает громко (вердикт A1 / RT-9).
 */
export const NON_CRITICAL_EVENING_STEPS = Object.freeze(['insight-drift.mjs']);
