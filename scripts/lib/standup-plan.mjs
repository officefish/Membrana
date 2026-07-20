/**
 * Стендап как персональный акт Тимлида (компонент S эпика ritual-refactor, вердикт M3).
 * Чистая функция `standup(dayIssue, engineSnapshot) → Plan`: детерминирована, без сети в
 * момент вычисления. Автор и единственный писатель — `vesnin`. Стендап РЕЗОЛВИТ и
 * привязывает существующие задачи движка (Linear-контейнеры заводятся в спринтах, не на
 * планёрке) — сам НЕ создаёт. Три состояния пункта, `emptyPlan` при непустом Day Issue.
 */

/** Автор стендапа — Тимлид. Единственный писатель плана и handoff-кешей (M3). */
export const STANDUP_AUTHOR = 'vesnin';

/** Три состояния пункта плана — не два серых (M3). */
export const ASSIGNMENT_STATE = Object.freeze({
  ASSIGNED: 'назначено', // владелец + живой taskRef
  GAP: 'пробел', // намерение без живой задачи (warning)
  ORPHAN: 'осиротело', // живой taskRef без владельца (error)
});

/**
 * Классификация пункта. Движок читается ТОЛЬКО как снимок (`engineSnapshot.tasks[ref].exists`);
 * стендап задачи не создаёт — отсутствие = `пробел`.
 * @param {{owner?: string|null, taskRef?: string|null}} intent
 * @param {{tasks?: Record<string, {exists?: boolean}>}} engineSnapshot
 * @returns {'назначено'|'пробел'|'осиротело'}
 */
export function classifyAssignment(intent, engineSnapshot) {
  const live = Boolean(intent?.taskRef && engineSnapshot?.tasks?.[intent.taskRef]?.exists);
  if (live && !intent.owner) return ASSIGNMENT_STATE.ORPHAN;
  if (intent?.owner && live) return ASSIGNMENT_STATE.ASSIGNED;
  return ASSIGNMENT_STATE.GAP;
}

/**
 * Стендап: Day Issue + снимок движка → детерминированный план назначений. Тот же вход +
 * то же состояние движка → тот же план (включая `order`). Автор — `vesnin`.
 * @param {{intents?: Array<{owner?: string|null, taskRef?: string|null, intent?: string, order?: number}>}} dayIssue
 * @param {{tasks?: Record<string, {exists?: boolean}>}} engineSnapshot снимок, заморожен в план
 * @returns {{author: string, assignments: Array<{owner: string|null, taskRef: string|null, intent: string, order: number, state: string}>, emptyPlan: boolean}}
 */
export function standup(dayIssue, engineSnapshot) {
  const intents = dayIssue?.intents ?? [];
  const assignments = intents
    .map((it, i) => ({
      owner: it.owner ?? null,
      taskRef: it.taskRef ?? null,
      intent: it.intent ?? '',
      order: Number.isFinite(it.order) ? it.order : i,
      state: classifyAssignment(it, engineSnapshot),
    }))
    .sort((a, b) => a.order - b.order || cmp(a.taskRef, b.taskRef) || cmp(a.intent, b.intent));

  const assigned = assignments.filter((a) => a.state === ASSIGNMENT_STATE.ASSIGNED).length;
  // emptyPlan: Day Issue непустой, но НИ ОДНОГО реального назначения — сигнальное состояние,
  // не молчаливый зелёный (M3, анти-«молчун»).
  const emptyPlan = intents.length > 0 && assigned === 0;

  return { author: STANDUP_AUTHOR, assignments, emptyPlan };
}

/**
 * Handoff-кеш исполнителя — чистая проекция плана на персону. Несёт ССЫЛКИ (taskRef,
 * memoryRef, planRef), не копии. Существует только для персон с ≥1 назначением
 * (`undefined` иначе). `memoryRef.revision` — версия памяти персоны (`git log -1`),
 * подаётся снаружи (граница чистоты); без неё — null.
 * @param {ReturnType<typeof standup>} plan
 * @param {string} persona
 * @param {{revision?: string|null}} [opts]
 * @returns {{persona: string, assignments: string[], memoryRef: {persona: string, revision: string|null}, planRef: string}|undefined}
 */
export function handoff(plan, persona, opts = {}) {
  const mine = (plan?.assignments ?? [])
    .filter((a) => a.owner === persona && a.state === ASSIGNMENT_STATE.ASSIGNED)
    .sort((a, b) => a.order - b.order || cmp(a.taskRef, b.taskRef));
  if (mine.length === 0) return undefined;
  return {
    persona,
    assignments: mine.map((a) => a.taskRef),
    memoryRef: { persona, revision: opts.revision ?? null },
    planRef: plan.author,
  };
}

/** Лексикографическое сравнение с null-безопасностью — для стабильного tie-break. */
function cmp(a, b) {
  const x = a ?? '';
  const y = b ?? '';
  return x < y ? -1 : x > y ? 1 : 0;
}
