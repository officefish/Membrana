/**
 * Pure metrics for detector benchmark reports.
 */

/** @param {{ truthDrone: boolean; predDrone: boolean }[]} pairs */
export function confusionFromPairs(pairs) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const { truthDrone, predDrone } of pairs) {
    if (truthDrone && predDrone) tp++;
    else if (!truthDrone && predDrone) fp++;
    else if (truthDrone && !predDrone) fn++;
    else tn++;
  }
  return { tp, fp, fn, tn };
}

export function precision(tp, fp) {
  const d = tp + fp;
  return d === 0 ? null : tp / d;
}

export function recall(tp, fn) {
  const d = tp + fn;
  return d === 0 ? null : tp / d;
}

export function f1Score(prec, rec) {
  if (prec == null || rec == null || prec + rec === 0) return null;
  return (2 * prec * rec) / (prec + rec);
}

export function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMs(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

/** @param {number[]} sorted ascending */
export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function sortNumbers(values) {
  return [...values].sort((a, b) => a - b);
}
