/**
 * membrana-leveling — buildWorkspaceLevelReport (K2 / §8.3).
 *
 * Детерминированный view над persisted gate-output. Без входа → «нет входа».
 * Три раздела поимённо; счётчики не единственный слой.
 */

/**
 * @typedef {import('./membrana-leveling-gate.mjs').runLevelingGate} RunGate
 * @typedef {Awaited<ReturnType<typeof import('./membrana-leveling-gate.mjs').runLevelingGate>>} GateOutput
 */

/**
 * @param {unknown} gateOutput
 * @param {{ builtAt?: string, gateArtifactRef?: string }} [meta]
 * @returns {{
 *   ok: boolean,
 *   markdown: string,
 *   sections: { merged: string[], stuck: string[], trash: string[] },
 * }}
 */
export function buildWorkspaceLevelReport(gateOutput, meta = {}) {
  if (
    gateOutput == null ||
    typeof gateOutput !== 'object' ||
    !('baskets' in /** @type {object} */ (gateOutput)) ||
    !('status' in /** @type {object} */ (gateOutput))
  ) {
    return {
      ok: false,
      markdown: '# workspace-level\n\nнет входа\n',
      sections: { merged: [], stuck: [], trash: [] },
    };
  }

  const g = /** @type {{
    status: string,
    reason?: string[],
    baskets: { L?: string[], R?: string[], U?: string[], T?: string[] },
    mainFill: string,
    shipped?: string[],
  }} */ (gateOutput);

  const R = g.baskets?.R ?? [];
  const U = g.baskets?.U ?? [];
  const T = g.baskets?.T ?? [];
  const L = g.baskets?.L ?? [];

  /** @type {string[]} */
  const merged = [];
  /** @type {string[]} */
  const stuck = [];

  if (g.mainFill === 'done') {
    for (const p of R) merged.push(p);
  } else if (g.mainFill === 'failed' || g.mainFill === 'pending') {
    for (const p of R) stuck.push(`${p} [R mainFill=${g.mainFill}]`);
  }
  // noop: R пуст — merged остаётся пустым (факт)

  for (const p of U) stuck.push(`${p} [U]`);

  const trash = T.map((p) => `${p} [T named]`);

  const builtAt = meta.builtAt ?? new Date().toISOString();
  const gateRef = meta.gateArtifactRef ?? '(inline)';

  const list = (arr) => (arr.length ? arr.map((x) => `- ${x}`).join('\n') : '- (пусто)');

  const reasons = (g.reason ?? []).length ? g.reason.join(', ') : '(нет)';

  const markdown = [
    '# workspace-level',
    '',
    `status: **${g.status}**`,
    `mainFill: **${g.mainFill}**`,
    `reason: ${reasons}`,
    `gate: ${gateRef}`,
    `builtAt: ${builtAt}`,
    `live (L, справочно): ${L.length ? L.join(', ') : '(пусто)'}`,
    '',
    '## Влито в main',
    list(merged),
    '',
    '## Застряло',
    list(stuck),
    '',
    '## Мусор найден',
    list(trash),
    '',
  ].join('\n');

  return {
    ok: true,
    markdown,
    sections: { merged, stuck, trash },
  };
}
