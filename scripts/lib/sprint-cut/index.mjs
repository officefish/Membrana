/**
 * Лицо ядра блока `cut-contract`: то, что блок отдаёт наружу (см. EXPECTATIONS.md).
 * Чистые предикаты: без `fs`, без сети, без часов.
 */
import {
  OVERSIZED_CHANGED_LINES,
  cutterFindings,
  modeOf,
  performerFindings,
  shapeFindings,
  volumeFindings,
  zoneFindings,
} from './cut-plan.mjs';
import { ratificationFindings } from './ratification.mjs';

export * from './act-kinds.mjs';
export * from './cut-plan.mjs';
export * from './ratification.mjs';

/**
 * Все находки по плану. Форма сломана → отдаётся ОДИН слой (`cut_shape`) и
 * остальные проверки не выполняются: пять зубов на мусоре сообщали бы чепуху.
 *
 * @param {unknown} plan
 * @param {{voices: readonly string[], acts?: Array<{kind: string, sprintId: string, subject: string}>}} ctx
 *   `voices` — закрытый список id реестра голосов значением; `acts` — разобранная лента актов
 *   плана. `acts` не передан → седьмой зуб НЕ выполняется (не «прошёл»): чистые вызовы ядра
 *   без ленты не начинают зеленеть молча.
 * @returns {{verdict: 'contract'|'findings'|'unreadable', findings: ReadonlyArray<{toothId: string, where: string, reason: string}>}}
 */
export function cutVerdict(plan, { voices, acts } = {}) {
  const shape = shapeFindings(plan, voices);
  if (shape.length > 0) return { verdict: 'unreadable', findings: Object.freeze(shape) };

  const findings = [
    ...volumeFindings(plan),
    ...performerFindings(plan, voices),
    ...zoneFindings(plan),
    ...ratificationFindings(plan),
    ...cutterFindings(plan, acts),
  ];
  return { verdict: findings.length === 0 ? 'contract' : 'findings', findings: Object.freeze(findings) };
}

/** Только находки (без вердикта) — форма, обещанная соседям. */
export const cutFindings = (plan, ctx) => cutVerdict(plan, ctx).findings;

/**
 * Проекция «назначен» — сторона ПЛАНА в честной паре «назначен / участвовал».
 * Отдаётся план, не факт: принятие контракта участием не делает.
 */
export const assignedBlocks = (plan) =>
  Object.freeze(
    (plan?.blocks ?? []).map((b) =>
      Object.freeze({
        blockId: b.blockId,
        persona: b.persona ?? null,
        context: b.context ?? null,
        zone: Object.freeze([...(b.zone ?? [])]),
        estimateChangedLines: b.estimate?.changedLines ?? null,
        mode: modeOf(plan),
        unassignedReason: b.unassignedReason ?? null,
      }),
    ),
  );

/**
 * Прогноз объёма и порог для сопоставления с исходом (`experience-loop`).
 * Единица — изменённые строки; порог — импортированный, не своё число.
 * Нет такого блока → `null`, а не ноль: «факта нет» ≠ «ноль».
 */
export function plannedVolume(plan, blockId) {
  const block = (plan?.blocks ?? []).find((b) => b.blockId === blockId);
  if (!block) return null;
  return Object.freeze({ changedLines: block.estimate?.changedLines ?? null, threshold: OVERSIZED_CHANGED_LINES });
}
