/**
 * worktree-sync-check — чистый предикат свежести базы дерева против origin/main
 * (K1, ADR-0014 Р2/Р5, #717).
 *
 * Вход — снимок refs ПОСЛЕ `git fetch` (fetch — отдельный шаг с таймаутом ВНЕ этой
 * функции) плюс явное `now`: внутри нет ни Date.now(), ни сети — юнит-тест бит-в-бит.
 *
 * Классы (Р2):
 *   fresh    — behind == 0: база на месте
 *   ff-able  — behind > 0 ∧ чисто ∧ ahead == 0: разрешена авто-перемотка --ff-only
 *   diverged — ahead > 0: свои коммиты в базе → rebase руками, авто-мутация запрещена
 *   dirty    — рабочее дерево грязное: только сигнал владельцу дерева (|writers|≤1)
 *
 * Находка расхождения ≠ сбой: exit-код за классы не отвечает (exit-code-semantics-audit).
 */

export const SYNC_CLASSES = Object.freeze(['fresh', 'ff-able', 'diverged', 'dirty']);

/** Пороги Р5 — дефолты; боевые значения читаются из конфига, не отсюда. */
export const DEFAULT_THRESHOLDS = Object.freeze({
  behindThreshold: 10,
  staleAgeDays: 7,
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {object} refs — снимок одного дерева после fetch
 * @param {string} refs.branch          — базовая ветка дерева
 * @param {number} refs.behind          — rev-list --count <branch>..origin/main
 * @param {number} refs.ahead           — rev-list --count origin/main..<branch>
 * @param {number} refs.dirtyCount      — строк `git status --porcelain` в дереве
 * @param {string|null} refs.mergeBase  — SHA merge-base с origin/main (в отчёт)
 * @param {string|null} refs.mergeBaseDate — ISO-дата коммита merge-base (для age)
 * @param {boolean} [refs.fetchFailed]  — fetch не прошёл: считано по локальным refs
 * @param {Date|string|number} now      — время снаружи (детерминизм)
 * @param {{behindThreshold?: number, staleAgeDays?: number}} [thresholds]
 * @returns {{class: string, behind: number, ahead: number, mergeBase: string|null,
 *           ageDays: number|null, stale: boolean, possiblyOutdated: boolean}}
 */
export function checkWorktreeSync(refs, now, thresholds = {}) {
  const behind = Math.max(0, Number(refs.behind) || 0);
  const ahead = Math.max(0, Number(refs.ahead) || 0);
  const dirty = (Number(refs.dirtyCount) || 0) > 0;
  const { behindThreshold, staleAgeDays } = { ...DEFAULT_THRESHOLDS, ...thresholds };

  let cls;
  if (dirty) cls = 'dirty';
  else if (ahead > 0) cls = 'diverged';
  else if (behind > 0) cls = 'ff-able';
  else cls = 'fresh';

  let ageDays = null;
  if (refs.mergeBaseDate) {
    const at = new Date(refs.mergeBaseDate).getTime();
    const ref = new Date(now).getTime();
    if (Number.isFinite(at) && Number.isFinite(ref)) {
      ageDays = Math.max(0, Math.floor((ref - at) / DAY_MS));
    }
  }

  return {
    class: cls,
    behind,
    ahead,
    mergeBase: refs.mergeBase ?? null,
    ageDays,
    // stale — повод для danger-цвета в отчёте (Р5), не для действия.
    stale: behind >= behindThreshold || (ageDays !== null && ageDays >= staleAgeDays),
    possiblyOutdated: Boolean(refs.fetchFailed),
  };
}

/** Авто-действие разрешено ровно одно: перемотка указателя без слияния (Р3). */
export function canAutoFastForward(check) {
  return check.class === 'ff-able';
}

/**
 * Строка отчёта по дереву (Р5): иконка+текст (a11y), причина с датой предка.
 * Возвращает {level, text}; цвет вешает вызывающий, семантика — здесь.
 */
export function formatSyncLine(name, check) {
  const marker = check.possiblyOutdated ? ' (fetch не прошёл — возможно неактуально)' : '';
  if (check.class === 'fresh') {
    return { level: 'ok', text: `✓ base '${name}' свежа (behind 0)${marker}` };
  }
  if (check.class === 'dirty') {
    return {
      level: 'info',
      text: `✋ base '${name}' — дерево грязное, синхрон не трогаю (сигнал владельцу)${marker}`,
    };
  }
  const age = check.ageDays !== null ? `, предок ${check.ageDays} дн назад` : '';
  if (check.class === 'diverged') {
    return {
      level: check.stale ? 'danger' : 'warn',
      text: `⚠ base '${name}' разошлась: −${check.behind}, +${check.ahead} свои → rebase руками, не ff${age}${marker}`,
    };
  }
  return {
    level: check.stale ? 'danger' : 'warn',
    text: `↻ base '${name}' отстала: −${check.behind}${age} — ff-able${marker}`,
  };
}
