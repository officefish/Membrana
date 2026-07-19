/**
 * Риторическая шестая величина — «доля переделок» (reworkRate).
 *
 * Поправка владельца 19.07 (вердикт M3): величина живёт ТОЛЬКО в аудите конца
 * дня, выводится чистой функцией, хранимым событием не подкрепляется, парной
 * метрики не требует (целью не является — не оптимизируется). В вечерний батч
 * пяти величин (measure-metrics.mjs) НЕ входит; вызывает её только аудит дня.
 *
 * Вход назван явно (закрыт открытый хвост эпика team-execution-contour):
 * те же два снимка реестра дня + артефакты закрытия за окно дня.
 * Переделка наблюдается как один из фиксируемых переходов:
 *   1) переоткрытие: карточка closed в prev → open/in-progress в curr;
 *   2) отзыв/переприсвоение приёмки: в acceptanceHistory артефакта >1 различного
 *      acceptedBy, либо текущая приёмка снята при непустой истории;
 *   3) регресс headRev: в acceptanceHistory ревизия заменена на другую.
 */

const MOVING_STATUSES = new Set(['open', 'in-progress']);

/**
 * @param {import('./measure-fixtures.mjs').RegistrySnapshot} prevSnapshot
 * @param {import('./measure-fixtures.mjs').RegistrySnapshot} currSnapshot
 * @param {import('./measure-fixtures.mjs').ClosureArtifact[]} closureArtifacts
 * @returns {{ rate: number, events: { taskId: string, kind: 'reopened' | 'acceptance-revoked' | 'headrev-regress' }[], considered: number, rhetorical: true }}
 */
export function computeReworkRhetoric(prevSnapshot, currSnapshot, closureArtifacts) {
  if (!Array.isArray(prevSnapshot?.cards) || !Array.isArray(currSnapshot?.cards)) {
    throw new Error('computeReworkRhetoric: вход — два снимка реестра (cards обязателен)');
  }
  if (!Array.isArray(closureArtifacts)) {
    throw new Error('computeReworkRhetoric: closureArtifacts должен быть массивом');
  }

  const currById = new Map(currSnapshot.cards.map((c) => [c.id, c]));
  /** @type {{ taskId: string, kind: 'reopened' | 'acceptance-revoked' | 'headrev-regress' }[]} */
  const events = [];

  // 1) Переоткрытие между срезами.
  for (const prevCard of prevSnapshot.cards) {
    if (prevCard.status !== 'closed') continue;
    const currCard = currById.get(prevCard.id);
    if (currCard && MOVING_STATUSES.has(currCard.status)) {
      events.push({ taskId: prevCard.id, kind: 'reopened' });
    }
  }

  // 2–3) Отзыв/переприсвоение приёмки и регресс headRev — по истории артефакта.
  for (const artifact of closureArtifacts) {
    const history = artifact.acceptanceHistory ?? [];
    const names = new Set(history.map((h) => h.acceptedBy).filter(Boolean));
    const revoked = names.size > 1 || (history.length > 0 && !artifact.acceptance?.acceptedBy);
    if (revoked) events.push({ taskId: artifact.taskId, kind: 'acceptance-revoked' });

    const revs = new Set(history.map((h) => h.headRev).filter(Boolean));
    if (revs.size > 1) events.push({ taskId: artifact.taskId, kind: 'headrev-regress' });
  }

  // Знаменатель: единицы, наблюдавшиеся закрытыми (в prev-срезе или артефактом).
  const considered = new Set([
    ...prevSnapshot.cards.filter((c) => c.status === 'closed').map((c) => c.id),
    ...closureArtifacts.map((a) => a.taskId),
  ]).size;

  const touched = new Set(events.map((e) => e.taskId)).size;
  events.sort((a, b) => (a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : a.kind < b.kind ? -1 : 1));

  return {
    rate: considered === 0 ? 0 : touched / considered,
    events,
    considered,
    rhetorical: true, // маркер: хранимым событием не подкрепляется, в батч не входит
  };
}
