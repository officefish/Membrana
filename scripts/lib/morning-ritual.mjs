/**
 * morning-ritual — чистое ядро барьера утреннего ритуала (вердикт
 * morning-ritual-regulation-background-agent-2026-07-18). Без fs/сети: решения
 * принимает над данными манифеста + состоянием. Обвязка (чтение манифеста, запуск
 * фона, витрина) — снаружи.
 *
 * СУТЬ: фоновый агент делает механику молча, но ФИЗИЧЕСКИ НЕ МОЖЕТ пройти гейт без
 * решения владельца. Не дисциплина («агент обещает не проглотить») — конструкция:
 * canAdvance над gate ложно, пока нет decision. Фон монотонно идёт по steps[] и
 * застывает на первом незакрытом гейте (d/dt=0, как горизонт).
 */

/** @typedef {{id:string, kind:'mechanic'|'gate', label?:string, verify?:string, blocksOn?:string|null}} Step */
/** @typedef {{decisions?: Record<string, unknown>}} State */

/**
 * Есть ли решение владельца по гейту. Решение = НЕПУСТОЕ значение в state.decisions[id].
 * Отсутствие ключа, null, undefined, '' — решения НЕТ (фон стоит).
 * @param {string} stepId
 * @param {State} state
 * @returns {boolean}
 */
export function hasDecision(stepId, state) {
  const d = state?.decisions ?? {};
  if (!Object.prototype.hasOwnProperty.call(d, stepId)) return false;
  const v = d[stepId];
  return v !== null && v !== undefined && v !== '';
}

/**
 * БАРЬЕР. Можно ли фону продвинуться через шаг.
 * mechanic — всегда (детерминированная механика).
 * gate — только если по нему есть решение владельца.
 * @param {Step} step
 * @param {State} state
 * @returns {boolean}
 */
export function canAdvance(step, state) {
  if (!step || typeof step.kind !== 'string') return false;
  if (step.kind === 'mechanic') return true;
  if (step.kind === 'gate') return hasDecision(step.id, state);
  return false; // неизвестный kind — консервативно СТОП (не молча пропускаем)
}

/**
 * Монотонный проход фона: индекс первого шага, где фон ЗАСТЫЛ (первый gate без
 * решения), либо steps.length если пройдены все. Фон не перепрыгивает застрявший
 * гейт — он барьер, а не предупреждение.
 * @param {Step[]} steps
 * @param {State} state
 * @returns {{ advanced: number, blockedAt: Step|null, blockedReason: string|null }}
 */
export function advanceFrontier(steps, state) {
  const list = Array.isArray(steps) ? steps : [];
  for (let i = 0; i < list.length; i += 1) {
    if (!canAdvance(list[i], state)) {
      return { advanced: i, blockedAt: list[i], blockedReason: list[i]?.blocksOn ?? 'gate' };
    }
  }
  return { advanced: list.length, blockedAt: null, blockedReason: null };
}

/**
 * Витрина статуса для владельца/UI: каждый шаг → done | active-gate | disabled.
 * done — фон прошёл; active-gate — здесь он застыл, ждёт решения; disabled — за
 * барьером, ещё не дошёл (НЕ выдаётся за clean/done — молчун-защита).
 * @param {Step[]} steps
 * @param {State} state
 * @returns {{ id:string, kind:string, label:string|undefined, status:'done'|'active-gate'|'disabled', blocksOn:string|null }[]}
 */
export function ritualStatus(steps, state) {
  const list = Array.isArray(steps) ? steps : [];
  const { advanced } = advanceFrontier(list, state);
  return list.map((s, i) => ({
    id: s.id,
    kind: s.kind,
    label: s.label,
    status: i < advanced ? 'done' : i === advanced ? (s.kind === 'gate' ? 'active-gate' : 'disabled') : 'disabled',
    blocksOn: s.blocksOn ?? null,
  }));
}
