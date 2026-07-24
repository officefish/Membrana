/**
 * Resolve effective chain for a procedure (C1).
 * `effective = overlay[id] ?? default[id]`; source: overlay|default.
 * Overlay pull — Phase C; здесь только merge при уже полученном overlay.
 */
import {
  loadProcedureDefaults,
  loadProcedureRegistry,
  PROCEDURE_ID_RE,
} from './llm-procedure-registry.mjs';

/**
 * @typedef {{ provider: string; model: string }} ChainStep
 * @typedef {{ chain: ChainStep[] }} ChainConfig
 * @typedef {{
 *   procedureId: string;
 *   chain: ChainStep[];
 *   source: 'overlay' | 'default';
 *   meters: boolean;
 *   entryMjs?: string;
 *   title?: string;
 *   yarnScript?: string;
 *   group?: string;
 * }} EffectiveProcedure
 */

/**
 * @param {string} procedureId
 * @param {{
 *   overlay?: Record<string, ChainConfig> | null;
 *   defaults?: Record<string, ChainConfig>;
 *   registry?: { procedures: Array<Record<string, unknown>> };
 * }} [opts]
 * @returns {EffectiveProcedure}
 */
export function resolveEffective(procedureId, opts = {}) {
  if (typeof procedureId !== 'string' || !PROCEDURE_ID_RE.test(procedureId)) {
    throw new Error(`resolveEffective: невалидный procedureId «${procedureId}»`);
  }

  const registry = opts.registry ?? loadProcedureRegistry();
  const defaults = opts.defaults ?? loadProcedureDefaults();
  const overlay = opts.overlay ?? null;

  const record = (registry.procedures ?? []).find((p) => p.id === procedureId);
  if (!record) {
    throw new Error(`resolveEffective: процедура «${procedureId}» не в реестре`);
  }

  /** @type {ChainConfig | undefined} */
  let cfg;
  /** @type {'overlay' | 'default'} */
  let source;

  const fromOverlay = overlay?.[procedureId];
  if (fromOverlay && Array.isArray(fromOverlay.chain) && fromOverlay.chain.length > 0) {
    cfg = fromOverlay;
    source = 'overlay';
  } else {
    cfg = defaults[procedureId];
    source = 'default';
  }

  if (!cfg || !Array.isArray(cfg.chain) || cfg.chain.length < 1) {
    throw new Error(
      `resolveEffective: нет chain для «${procedureId}» (builtin-fail; overlay и default пусты)`,
    );
  }

  return {
    procedureId,
    chain: cfg.chain.map((s) => ({
      provider: String(s.provider),
      model: String(s.model),
    })),
    source,
    meters: Boolean(record.meters),
    entryMjs: typeof record.entryMjs === 'string' ? record.entryMjs : undefined,
    title: typeof record.title === 'string' ? record.title : undefined,
    yarnScript: typeof record.yarnScript === 'string' ? record.yarnScript : undefined,
    group: typeof record.group === 'string' ? record.group : undefined,
  };
}
