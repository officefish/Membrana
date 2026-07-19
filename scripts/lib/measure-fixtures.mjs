/**
 * Фабрика фикстурных снимков реестра и артефактов закрытия — СТАБЫ соседей.
 *
 * Замещает: producer снимка (блок snapshot-cold-migration) и closure-артефакт
 * живого lifecycle. Используется только тестами блока units-trace-measure.
 * В интеграционную ветку не мёржится; стаб, доживший до прода, — дефект интеграции
 * (регламент Cowork Sprint, Hard rules изоляции §3).
 *
 * Форма снимка — ДОПУЩЕНИЕ блока (см. team-units-trace-measure/EXPECTATIONS.md),
 * сводится с реальной формой на Interface Consilium (швы №2 и №3 brief).
 */

/**
 * @typedef {'open' | 'in-progress' | 'closed'} UnitStatus
 *
 * @typedef {object} SnapshotCard карточка единицы работы (центральная задача = GitHub-issue)
 * @property {string} id
 * @property {UnitStatus} status
 * @property {string | null} leadPersona персона, принявшая выход
 * @property {string} createdAt ISO
 * @property {string | null} [closedAt] ISO; только у closed
 *
 * @typedef {object} RegistrySnapshot
 * @property {{ capturedAt: string, sourceRevision: string }} header honest-провенанс
 * @property {SnapshotCard[]} cards
 *
 * @typedef {object} AcceptanceEntry
 * @property {string | null} acceptedBy
 * @property {string} headRev
 *
 * @typedef {object} ClosureArtifact
 * @property {string} taskId
 * @property {string} closedAt ISO
 * @property {AcceptanceEntry | null} acceptance текущая приёмка
 * @property {AcceptanceEntry[]} [acceptanceHistory] история приёмки; >1 различного acceptedBy = переприсвоение
 */

/** @returns {SnapshotCard} */
export function makeCard(overrides = {}) {
  return {
    id: 'task-1',
    status: 'open',
    leadPersona: 'vesnin',
    createdAt: '2026-07-18T08:00:00.000Z',
    closedAt: null,
    ...overrides,
  };
}

/** @returns {RegistrySnapshot} */
export function makeSnapshot({ capturedAt, sourceRevision, cards }) {
  if (!capturedAt || !sourceRevision) {
    throw new Error('makeSnapshot: фикстурный снимок обязан нести honest-провенанс (capturedAt, sourceRevision)');
  }
  return { header: { capturedAt, sourceRevision }, cards };
}

/** @returns {ClosureArtifact} */
export function makeClosureArtifact(overrides = {}) {
  return {
    taskId: 'task-1',
    closedAt: '2026-07-19T17:00:00.000Z',
    acceptance: { acceptedBy: 'vesnin', headRev: 'a'.repeat(40) },
    ...overrides,
  };
}

/**
 * Детерминированная пара снимков «вчера/сегодня» + артефакты закрытия окна.
 * Сюжет: t-2 закрыта в окне (артефакт есть), t-3 переоткрыта (переделка),
 * t-4 сменила персону (эскалация), t-5 без владельца, t-1/t-6 движутся.
 */
export function makeSnapshotPair() {
  const prev = makeSnapshot({
    capturedAt: '2026-07-18T18:00:00.000Z',
    sourceRevision: 'f'.repeat(40),
    cards: [
      makeCard({ id: 't-1', status: 'open', leadPersona: 'vesnin', createdAt: '2026-07-16T08:00:00.000Z' }),
      makeCard({ id: 't-2', status: 'in-progress', leadPersona: 'dynin', createdAt: '2026-07-17T09:00:00.000Z' }),
      makeCard({ id: 't-3', status: 'closed', leadPersona: 'ozhegov', createdAt: '2026-07-15T10:00:00.000Z', closedAt: '2026-07-18T12:00:00.000Z' }),
      makeCard({ id: 't-4', status: 'open', leadPersona: 'kuryokhin', createdAt: '2026-07-18T11:00:00.000Z' }),
      makeCard({ id: 't-5', status: 'open', leadPersona: null, createdAt: '2026-07-18T12:00:00.000Z' }),
    ],
  });
  const curr = makeSnapshot({
    capturedAt: '2026-07-19T18:00:00.000Z',
    sourceRevision: 'e'.repeat(40),
    cards: [
      makeCard({ id: 't-1', status: 'in-progress', leadPersona: 'vesnin', createdAt: '2026-07-16T08:00:00.000Z' }),
      makeCard({ id: 't-2', status: 'closed', leadPersona: 'dynin', createdAt: '2026-07-17T09:00:00.000Z', closedAt: '2026-07-19T15:00:00.000Z' }),
      makeCard({ id: 't-3', status: 'open', leadPersona: 'ozhegov', createdAt: '2026-07-15T10:00:00.000Z' }), // переоткрыта
      makeCard({ id: 't-4', status: 'open', leadPersona: 'rodchenko', createdAt: '2026-07-18T11:00:00.000Z' }), // эскалация
      makeCard({ id: 't-5', status: 'open', leadPersona: null, createdAt: '2026-07-18T12:00:00.000Z' }),
      makeCard({ id: 't-6', status: 'open', leadPersona: 'vesnin', createdAt: '2026-07-19T10:00:00.000Z' }),
    ],
  });
  const closureArtifacts = [
    makeClosureArtifact({ taskId: 't-2', closedAt: '2026-07-19T15:00:00.000Z' }),
  ];
  return { prev, curr, closureArtifacts };
}
