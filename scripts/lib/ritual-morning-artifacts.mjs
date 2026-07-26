/**
 * Canonical morning ritual outputs that must land on origin/main (ritual-deliver-to-main).
 */

/** @typedef {{ rel: string, label: string }} MorningDeliverArtifact */

/** @type {MorningDeliverArtifact[]} */
export const MORNING_DELIVER_ARTIFACTS = Object.freeze([
  { rel: 'docs/STRATEGY_DAY.md', label: 'STRATEGY_DAY' },
  { rel: 'docs/DAILY_STANDUP.md', label: 'DAILY_STANDUP' },
  { rel: 'docs/MAIN_DAY_ISSUE.md', label: 'MAIN_DAY_ISSUE' },
]);

/**
 * @param {MorningDeliverArtifact[]} [artifacts]
 * @returns {string[]}
 */
export function morningDeliverPaths(artifacts = MORNING_DELIVER_ARTIFACTS) {
  return artifacts.map((a) => a.rel);
}
