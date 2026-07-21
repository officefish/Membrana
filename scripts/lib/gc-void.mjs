/**
 * GC — затирание следов альтернативных сценариев (вердикт M5-GC angelina-hostess, 21.07).
 *
 * «Затереть» ≠ «удалить»: история — актив, затирается ЧИТАЕМОСТЬ мёртвого пути живой
 * сессией. Приговор (rejected) выносит только закрытый вердикт с ответственным — GC сам
 * не судит, он детерминированно исполняет: переносит приговорённое в `docs/void/` с
 * YAML-эпитафией. Void растёт монотонно; удаления из него запрещены.
 *
 * Чистое ядро: предикаты и рендер эпитафий; fs — у раннера.
 */

export const VOID_DIR = 'docs/void';

/** Срок старения ШТРАФА (не памяти): после 90 дней запись помечается истёкшей. */
export const STALE_DAYS = 90;

/**
 * Приговорён ли след: rejected И вердикт закрыт. Даты/статусы приходят из реестра
 * следов — не из Date.now (детерминизм).
 * @param {{status?: string, verdictClosed?: boolean}} s
 * @returns {boolean}
 */
export function isDead(s) {
  return s?.status === 'rejected' && s?.verdictClosed === true;
}

/**
 * Истёк ли штраф свежести (для recent_void_penalty): rejectedAt старше STALE_DAYS.
 * `today` подаётся снаружи.
 * @param {{rejectedAt?: string}} s
 * @param {string} today YYYY-MM-DD
 * @returns {boolean}
 */
export function isStale(s, today) {
  if (!s?.rejectedAt) return false;
  const days = (Date.parse(today) - Date.parse(s.rejectedAt)) / 86_400_000;
  return Number.isFinite(days) && days > STALE_DAYS;
}

/**
 * YAML-эпитафия для файла в void: кто приговорил, за что, когда (три барьера, барьер №1 —
 * шапка в самом файле, читается первой строкой).
 * @param {{status?: string, verdict?: string, rejectedReason?: string, rejectedAt?: string, rejectedBy?: string}} s
 * @returns {string}
 */
export function epitaph(s) {
  return [
    '---',
    'status: rejected',
    `verdict: ${s?.verdict ?? '—'}`,
    `rejectedReason: ${s?.rejectedReason ?? '—'}`,
    `rejectedAt: ${s?.rejectedAt ?? '—'}`,
    `rejectedBy: ${s?.rejectedBy ?? '—'}`,
    'void: этот путь МЁРТВ — живым не является; не восстанавливать без нового вердикта',
    '---',
    '',
  ].join('\n');
}

/**
 * recent_void_penalty: свежеотвергнутые id (не истёкшие) — генераторы штрафуют их,
 * чтобы идея не переоткрылась под новым именем.
 * @param {Array<{id: string, rejectedAt?: string}>} voidIndex
 * @param {string} today
 * @returns {Set<string>}
 */
export function recentVoidIds(voidIndex, today) {
  return new Set((voidIndex ?? []).filter((s) => !isStale(s, today)).map((s) => s.id));
}

/**
 * Отчёт-эпитафии прохода (GC обязан быть шумным: «перенесено 0» тоже печатается).
 * @param {Array<{id: string, rejectedAt?: string}>} moved
 * @param {string} today
 * @returns {string}
 */
export function gcReport(moved, today) {
  const lines = [`GC: перенесено ${moved.length}`];
  for (const s of moved) {
    lines.push(`  † ${s.id} (${isStale(s, today) ? 'ghost — штраф истёк' : 'свежий — recent_void_penalty'})`);
  }
  return lines.join('\n');
}
