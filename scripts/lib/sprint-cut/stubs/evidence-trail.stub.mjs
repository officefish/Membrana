/**
 * КОНТРАКТ ГРАНИЦЫ для зубов — тестовый дублёр читателя ленты вещдоков, живёт рядом с формой.
 *
 * Прежняя шапка звала себя «дефектом интеграции, дожившим до прода» — это было неправдой
 * дважды (вердикт Веснина, шот stubs-verdict 03.08). Дублёр здесь осознанно: он изолирует
 * зубы формы cut-плана (`sprint-cut-check.test.mjs` — единственный потребитель) от временной
 * лестницы девяти вердиктов живого `execution-gate`. Тест формы не обязан знать, что такое
 * `stale_partial`, чтобы проверить сортировку актов.
 *
 * НО постоянной опорой это не назначено: зелёный тест на дублёре молчит о расхождении с
 * живым исполнением, и такое недоверие к собственной системе — долг, у которого видна дата
 * погашения. Карточка: `sprint-cut-teeth-to-live-modules` — зубы формы переходят на живые
 * `execution-gate` / `experience-loop`, срок — выход живой петли опыта на стабильный
 * контракт. Снос дублёра — вместе с переходом, не раньше.
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
