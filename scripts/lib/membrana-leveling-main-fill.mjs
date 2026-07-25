/**
 * membrana-leveling — main-fill train (T9/#700 / §8.3).
 *
 * ready → main сериализованным pr:ship-поездом: влил → main поехал →
 * пере-проверил остальных → следующая. Реальный ship — inject `shipOne`.
 */

/**
 * @typedef {object} ReadyUnit
 * @property {string} id unit id (PR/branch/card)
 * @property {string[]} [paths]
 */

/**
 * @typedef {'done' | 'noop' | 'failed' | 'pending'} MainFillStatus
 */

/**
 * @param {ReadyUnit[]} readyUnits
 * @returns {{ queue: ReadyUnit[], mode: 'pr:ship-train' }}
 */
export function planMainFill(readyUnits) {
  const queue = [];
  const seen = new Set();
  for (const u of readyUnits ?? []) {
    if (!u || typeof u.id !== 'string' || !u.id.trim()) continue;
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    queue.push({ id: u.id, paths: Array.isArray(u.paths) ? [...u.paths] : [] });
  }
  return { queue, mode: 'pr:ship-train' };
}

/**
 * Сериализованный поезд. `shipOne(unit)` → { ok: boolean, detail?: string }.
 * После каждого успеха вызывается optional `recheckRemaining(rest)` (пере-проверка).
 *
 * @param {ReadyUnit[]} readyUnits
 * @param {{
 *   shipOne?: (unit: ReadyUnit) => { ok: boolean, detail?: string },
 *   recheckRemaining?: (rest: ReadyUnit[]) => void,
 * }} [deps]
 * @returns {{
 *   status: MainFillStatus,
 *   shipped: string[],
 *   failed: string[],
 *   queue: ReadyUnit[],
 * }}
 */
export function runMainFillTrain(readyUnits, deps = {}) {
  const { queue } = planMainFill(readyUnits);
  if (queue.length === 0) {
    return { status: 'noop', shipped: [], failed: [], queue };
  }

  const shipOne =
    deps.shipOne ??
    (() => ({
      ok: false,
      detail: 'shipOne not injected — dry-run refuses real merge',
    }));

  /** @type {string[]} */
  const shipped = [];
  /** @type {string[]} */
  const failed = [];

  for (let i = 0; i < queue.length; i += 1) {
    const unit = queue[i];
    const rest = queue.slice(i + 1);
    let result;
    try {
      result = shipOne(unit);
    } catch (err) {
      result = { ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
    if (!result?.ok) {
      failed.push(unit.id);
      return {
        status: 'failed',
        shipped,
        failed,
        queue,
      };
    }
    shipped.push(unit.id);
    if (typeof deps.recheckRemaining === 'function' && rest.length) {
      deps.recheckRemaining(rest);
    }
  }

  return { status: 'done', shipped, failed, queue };
}
