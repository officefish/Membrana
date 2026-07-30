/**
 * СТАБ выхода блока `cut-contract`: ратифицированный план нарезки в МОЕЙ односторонней форме.
 * Плана соседа до Phase 3 не существует; форма ниже — догадка о шве, не договорённость.
 * Стаб в интеграционную ветку не мёржится: стаб, доживший до прода, — дефект интеграции.
 *
 * Форма нарочно минимальна: всё, что предикату не нужно (контекст, файловая зона, оценка
 * объёма), здесь ОТСУТСТВУЕТ — гейт объёма не считает и в него не заглядывает.
 */

const WINDOW = Object.freeze({ from: '2026-07-30T06:00:00.000Z', to: '2026-07-31T06:00:00.000Z' });
const REVISION = '2026-07-30T08:00:00.000Z';

/** Два блока одного окна — базовый план всех фикстур Phase 2. */
const planTwoBlocks = Object.freeze({
  planId: 'cowork-honest-sprint-stub',
  ratified: true,
  ratification: Object.freeze({ by: 'owner', at: '2026-07-30T05:30:00.000Z', digest: 'stub-digest-01' }),
  window: WINDOW,
  revisionAt: REVISION,
  blocks: Object.freeze([
    Object.freeze({ blockId: 'mfcc-core', assigned: 'kuryokhin' }),
    Object.freeze({ blockId: 'gate-wiring', assigned: 'vesnin' }),
  ]),
});

/** @type {Record<string, object>} */
const PLANS = {
  'plan-two-blocks': planTwoBlocks,

  // Вторая дверь (M7): второй блок объявлен без персональной ответственности с причиной из
  // закрытого списка четырёх (OWNER_ANSWERS §2).
  'plan-refused': {
    ...planTwoBlocks,
    blocks: [
      { blockId: 'mfcc-core', assigned: 'kuryokhin' },
      { blockId: 'gate-wiring', assigned: 'vesnin', mode: 'no_personal_responsibility', reason: 'mechanical' },
    ],
  },

  // «Разведка/прототип» отвергнута владельцем сознательно — самая вероятная лазейка второй двери.
  'plan-refused-recon': {
    ...planTwoBlocks,
    blocks: [
      { blockId: 'mfcc-core', assigned: 'kuryokhin' },
      { blockId: 'gate-wiring', assigned: 'vesnin', mode: 'no_personal_responsibility', reason: 'recon' },
    ],
  },

  'plan-not-ratified': { ...planTwoBlocks, ratified: false },

  // Метки ревизии нет ни у блока, ни у плана → протухание не вычисляется.
  'plan-no-revision': { ...planTwoBlocks, revisionAt: undefined },

  'plan-unknown-persona': {
    ...planTwoBlocks,
    blocks: [
      { blockId: 'mfcc-core', assigned: 'kuryokhin' },
      { blockId: 'gate-wiring', assigned: 'stakhanov' },
    ],
  },

  // Ненулевой grace задаётся ПЛАНОМ как параметр окна, а не «когда вспомнили».
  'plan-grace-2h': {
    ...planTwoBlocks,
    blocks: [
      { blockId: 'mfcc-core', assigned: 'kuryokhin' },
      { blockId: 'gate-wiring', assigned: 'vesnin', graceMs: 2 * 60 * 60 * 1000 },
    ],
  },
};

/** @type {readonly string[]} */
export const STUB_PLAN_NAMES = Object.freeze(Object.keys(PLANS));

/**
 * @param {string} name
 * @returns {object}
 */
export function stubPlan(name) {
  const plan = PLANS[name];
  if (plan === undefined) {
    throw new Error(`Стаб плана «${name}» не существует. Есть: ${STUB_PLAN_NAMES.join(', ')}`);
  }
  return JSON.parse(JSON.stringify(plan));
}
