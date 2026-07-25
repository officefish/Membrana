/**
 * membrana-leveling — гейт K4 / §8.3 (оркестратор, не классификатор).
 *
 * Вход: снимок path+ctx → disposition → корзины → акты naming/registry → main-fill.
 * PASS = Named(T) ∧ Registered(U) ∧ Filled(R).
 *
 * @see docs/prompts/MEMBRANA_LEVELING_REGULATION.md §3
 */
import { disposition } from './membrana-leveling-disposition.mjs';
import { runMainFillTrain } from './membrana-leveling-main-fill.mjs';

/**
 * @typedef {import('./membrana-leveling-disposition.mjs').Disposition} Disposition
 * @typedef {import('./membrana-leveling-disposition.mjs').DispositionCtx} DispositionCtx
 * @typedef {import('./membrana-leveling-main-fill.mjs').MainFillStatus} MainFillStatus
 */

/**
 * Мин. контракт карточки unfinished (T7).
 * WIP-коммит ≠ регистрация — отдельный порт `wipCommitOnly` → отказ.
 *
 * @typedef {object} UnfinishedCard
 * @property {string} id
 * @property {'unfinished'} state
 * @property {string} whyNotReady
 * @property {string} nextAction
 * @property {string} snapshotRef
 * @property {boolean} [wipCommitOnly] если true — карточка НЕ засчитывается
 */

/**
 * @typedef {object} TrashNamingAct
 * @property {'dispose' | 'ignore'} action
 * @property {string} reason
 */

/**
 * @typedef {object} GateItem
 * @property {string} path
 * @property {DispositionCtx} [ctx]
 * @property {Disposition} [disposition] если задан — не пересчитывать
 * @property {string} [unitId] для ready → main-fill queue
 */

/**
 * @param {UnfinishedCard | null | undefined} card
 * @returns {boolean}
 */
export function isValidUnfinishedCard(card) {
  if (!card || typeof card !== 'object') return false;
  if (card.wipCommitOnly) return false;
  if (card.state !== 'unfinished') return false;
  if (typeof card.id !== 'string' || !card.id.trim()) return false;
  if (typeof card.whyNotReady !== 'string' || !card.whyNotReady.trim()) return false;
  if (typeof card.nextAction !== 'string' || !card.nextAction.trim()) return false;
  if (typeof card.snapshotRef !== 'string' || !card.snapshotRef.trim()) return false;
  return true;
}

/**
 * @param {TrashNamingAct | null | undefined} act
 * @returns {boolean}
 */
export function isValidTrashNaming(act) {
  if (!act || typeof act !== 'object') return false;
  if (act.action !== 'dispose' && act.action !== 'ignore') return false;
  return typeof act.reason === 'string' && act.reason.trim().length > 0;
}

/**
 * Шаги 1–3: disposition + корзины.
 *
 * @param {GateItem[]} items
 * @returns {{
 *   classified: { path: string, disposition: Disposition, unitId: string | null }[],
 *   baskets: { L: string[], R: string[], U: string[], T: string[] },
 * }}
 */
export function classifySnapshot(items) {
  /** @type {{ path: string, disposition: Disposition, unitId: string | null }[]} */
  const classified = [];
  /** @type {{ L: string[], R: string[], U: string[], T: string[] }} */
  const baskets = { L: [], R: [], U: [], T: [] };

  for (const item of items ?? []) {
    if (!item || typeof item.path !== 'string' || !item.path) continue;
    const d =
      item.disposition ??
      disposition(item.path, item.ctx ?? {});
    const unitId =
      typeof item.unitId === 'string' && item.unitId
        ? item.unitId
        : item.ctx?.unitOf != null
          ? String(item.ctx.unitOf)
          : null;
    classified.push({ path: item.path, disposition: d, unitId });
    if (d === 'live') baskets.L.push(item.path);
    else if (d === 'ready') baskets.R.push(item.path);
    else if (d === 'unfinished') baskets.U.push(item.path);
    else baskets.T.push(item.path);
  }

  return { classified, baskets };
}

/**
 * Гейт-процедура 1–9.
 *
 * @param {{
 *   items: GateItem[],
 *   namedTrash?: Record<string, TrashNamingAct>,
 *   unfinishedCards?: Record<string, UnfinishedCard>,
 *   mainFill?: {
 *     shipOne?: (unit: { id: string, paths: string[] }) => { ok: boolean, detail?: string },
 *     recheckRemaining?: (rest: { id: string, paths: string[] }[]) => void,
 *     injectStatus?: MainFillStatus,
 *   },
 * }} input
 * @returns {{
 *   status: 'pass' | 'stop',
 *   reason: string[],
 *   baskets: { L: string[], R: string[], U: string[], T: string[] },
 *   mainFill: MainFillStatus,
 *   classified: { path: string, disposition: Disposition, unitId: string | null }[],
 *   shipped: string[],
 *   named: { trash: string[], unfinished: string[] },
 * }}
 */
export function runLevelingGate(input) {
  const { classified, baskets } = classifySnapshot(input.items ?? []);
  /** @type {string[]} */
  const reason = [];
  const namedTrash = input.namedTrash ?? {};
  const unfinishedCards = input.unfinishedCards ?? {};

  // 4. L: no-op — live не стопорит
  // 5. T: naming
  /** @type {string[]} */
  const namedT = [];
  for (const p of baskets.T) {
    if (isValidTrashNaming(namedTrash[p])) namedT.push(p);
  }
  const unnamed = baskets.T.filter((p) => !namedT.includes(p));
  if (unnamed.length > 0) {
    reason.push('unnamed-trash');
    return {
      status: 'stop',
      reason,
      baskets,
      mainFill: 'pending',
      classified,
      shipped: [],
      named: { trash: namedT, unfinished: [] },
    };
  }

  // 6. U: registry cards
  /** @type {string[]} */
  const namedU = [];
  for (const p of baskets.U) {
    if (isValidUnfinishedCard(unfinishedCards[p])) namedU.push(p);
  }
  const unregistered = baskets.U.filter((p) => !namedU.includes(p));
  if (unregistered.length > 0) {
    reason.push('unregistered-unfinished');
    return {
      status: 'stop',
      reason,
      baskets,
      mainFill: 'pending',
      classified,
      shipped: [],
      named: { trash: namedT, unfinished: namedU },
    };
  }

  // 7. R: main-fill
  /** @type {MainFillStatus} */
  let mainFill = 'pending';
  /** @type {string[]} */
  let shipped = [];

  if (input.mainFill?.injectStatus) {
    mainFill = input.mainFill.injectStatus;
  } else {
    /** @type {Map<string, string[]>} */
    const byUnit = new Map();
    for (const row of classified.filter((c) => c.disposition === 'ready')) {
      const id = row.unitId || row.path;
      if (!byUnit.has(id)) byUnit.set(id, []);
      byUnit.get(id)?.push(row.path);
    }
    const units = [...byUnit.entries()].map(([id, paths]) => ({ id, paths }));
    const train = runMainFillTrain(units, {
      shipOne: input.mainFill?.shipOne,
      recheckRemaining: input.mainFill?.recheckRemaining,
    });
    mainFill = train.status;
    shipped = train.shipped;
  }

  if (mainFill === 'failed') {
    reason.push('main-fill-failed');
    return {
      status: 'stop',
      reason,
      baskets,
      mainFill,
      classified,
      shipped,
      named: { trash: namedT, unfinished: namedU },
    };
  }

  // Filled(R): done | noop (R=∅). pending без inject не должен дойти сюда после train.
  if (mainFill !== 'done' && mainFill !== 'noop') {
    reason.push('main-fill-failed');
    return {
      status: 'stop',
      reason,
      baskets,
      mainFill: 'failed',
      classified,
      shipped,
      named: { trash: namedT, unfinished: namedU },
    };
  }

  // 8–9 PASS = Named(T) ∧ Registered(U) ∧ Filled(R)
  return {
    status: 'pass',
    reason: [],
    baskets,
    mainFill,
    classified,
    shipped,
    named: { trash: namedT, unfinished: namedU },
  };
}
