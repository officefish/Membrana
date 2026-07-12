/**
 * Drift-Anchor — чистое ядро `computeDrift` (DA0).
 *
 * Без I/O / сети / LLM (консилиум). Сравнивает current-снимок с версионируемым
 * baseline и выносит детерминированный вердикт по каждому компоненту:
 *  - structural: изменился/исчез/новый → 'drift'/'broken'; равен → 'ok'.
 *  - behavioral: |current − baseline| по порогам ε₁ (drift) / ε₂ (broken).
 * Детерминизм: два одинаковых снимка → все 'ok'; сортировка результатов по id.
 */

import type {
  AnchorResult,
  DriftThresholds,
  DriftVerdict,
  MorningDriftDigest,
  Snapshot,
  SnapshotComponent,
} from './types.js';

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function compareStructural(
  base: SnapshotComponent,
  cur: SnapshotComponent | undefined,
): AnchorResult {
  if (cur === undefined) {
    return { id: base.id, kind: 'structural', baseline: base.value, current: null, delta: 1, verdict: 'broken' };
  }
  const changed = String(base.value) !== String(cur.value);
  return {
    id: base.id,
    kind: 'structural',
    baseline: base.value,
    current: cur.value,
    delta: changed ? 1 : 0,
    verdict: changed ? 'drift' : 'ok',
  };
}

function compareBehavioral(
  base: SnapshotComponent,
  cur: SnapshotComponent | undefined,
  t: DriftThresholds,
): AnchorResult {
  if (cur === undefined) {
    return { id: base.id, kind: 'behavioral', baseline: base.value, current: null, delta: Infinity, verdict: 'broken' };
  }
  const b = Number(base.value);
  const c = Number(cur.value);
  const delta = Math.abs(c - b);
  const verdict: DriftVerdict = delta > t.epsilon2 ? 'broken' : delta > t.epsilon1 ? 'drift' : 'ok';
  return { id: base.id, kind: 'behavioral', baseline: base.value, current: cur.value, delta, verdict };
}

/** Компонент есть в current, но нет в baseline — новая (нетракуемая) структура = дрейф. */
function newComponent(cur: SnapshotComponent): AnchorResult {
  return {
    id: cur.id,
    kind: cur.kind,
    baseline: null,
    current: cur.value,
    delta: 1,
    verdict: 'drift',
  };
}

/**
 * Детерминированный дрейф-дайджест. `generatedAt` = `current.takenAt` (без Date.now —
 * чистота/воспроизводимость). Пороги — только для behavioral.
 */
export function computeDrift(
  baseline: Snapshot,
  current: Snapshot,
  thresholds: DriftThresholds,
): MorningDriftDigest {
  const curById = new Map(current.components.map((c) => [c.id, c]));
  const baseIds = new Set(baseline.components.map((c) => c.id));
  const anchors: AnchorResult[] = [];

  for (const base of baseline.components) {
    const cur = curById.get(base.id);
    anchors.push(
      base.kind === 'behavioral'
        ? compareBehavioral(base, cur, thresholds)
        : compareStructural(base, cur),
    );
  }
  for (const cur of current.components) {
    if (!baseIds.has(cur.id)) {
      anchors.push(newComponent(cur));
    }
  }

  anchors.sort(byId);
  const summary = { ok: 0, drift: 0, broken: 0 };
  for (const a of anchors) summary[a.verdict] += 1;

  return { generatedAt: current.takenAt, anchors, summary };
}
