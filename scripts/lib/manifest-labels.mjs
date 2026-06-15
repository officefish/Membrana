/**
 * Curated ground-truth labels in benchmark manifest (VDR3+).
 */

/**
 * @param {{ label?: string }} entry
 */
export function isCuratedLabel(entry) {
  return entry.label === 'drone' || entry.label === 'not-drone';
}

/**
 * @template {{ label?: string }} T
 * @param {T[]} samples
 * @returns {T[]}
 */
export function filterCuratedSamples(samples) {
  return samples.filter(isCuratedLabel);
}
