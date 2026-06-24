/**
 * Async-capable semantics для Sequence parallel mode (ES4).
 * @see docs/prompts/DEVICE_BOARD_EXEC_SEQUENCE_EPIC_PROMPT.md §ES4
 */

import type { ScenarioGraphNode } from './scenario-graph.js';
import type { ScenarioNodeKind } from './scenario-node-kind.js';
import { resolveScenarioGraphNodePure } from './scenario-node-pure.js';

/**
 * Узлы, безопасные в параллельных Then-ветках Sequence по умолчанию
 * (latent / orchestration).
 */
export const DEFAULT_ASYNC_CAPABLE_SCENARIO_NODE_KINDS = [
  'pause-runtime',
  'sequence',
] as const satisfies readonly ScenarioNodeKind[];

export type DefaultAsyncCapableScenarioNodeKind =
  (typeof DEFAULT_ASYNC_CAPABLE_SCENARIO_NODE_KINDS)[number];

/** True, если `nodeKind` async-capable по умолчанию. */
export function isDefaultAsyncCapableScenarioNodeKind(
  value: string,
): value is DefaultAsyncCapableScenarioNodeKind {
  return (DEFAULT_ASYNC_CAPABLE_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/**
 * Эффективное `supportsAsync` для pre-run / runtime gate.
 * Pure-узлы допускаются (exec-transparent, без shared impure side-effects).
 */
export function resolveScenarioGraphNodeSupportsAsync(
  node: Pick<ScenarioGraphNode, 'nodeKind' | 'supportsAsync' | 'pure'>,
): boolean {
  if (node.supportsAsync === true) {
    return true;
  }
  if (node.supportsAsync === false) {
    return false;
  }
  const kind = node.nodeKind;
  if (kind === undefined) {
    return false;
  }
  if (isDefaultAsyncCapableScenarioNodeKind(kind)) {
    return true;
  }
  return resolveScenarioGraphNodePure(node);
}
