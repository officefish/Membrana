/**
 * СТАБ читателя ленты вещдоков исполнения — замещает будущий блок `execution-gate`.
 * Форма придумана односторонне (Phase 2, изоляция), в интеграцию НЕ мёржится:
 * стаб, доживший до прода, — дефект интеграции.
 *
 * Ключ соединения — мой `blockId`. Пустой ответ = «вещдоков нет», а НЕ «чисто».
 * `null` от `actualChangedLines` = «факта нет», а не ноль.
 */

/** @param {{acts?: Array<{blockId: string, personaId: string, kind: string, at: string, evidenceRef?: string}>}} trail */
export function makeEvidenceTrailStub(trail = {}) {
  const acts = [...(trail.acts ?? [])].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return Object.freeze({
    /** @returns {ReadonlyArray<object>} акты по блоку, по `at` возрастающе */
    actsForBlock: (blockId) => Object.freeze(acts.filter((a) => a.blockId === blockId)),
    /** @returns {number|null} фактические изменённые строки — та же единица, что мой прогноз */
    actualChangedLines: (blockId) => {
      const fact = (trail.actual ?? {})[blockId];
      return typeof fact === 'number' ? fact : null;
    },
  });
}
