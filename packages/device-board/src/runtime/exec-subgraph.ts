import type { ScenarioFunctionSubgraph, ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import type { ScenarioRuntimeHost } from './host.js';
import type { ScenarioDetectionResult } from './types.js';

import type { ScenarioRuntimeBranch } from './types.js';

export interface ExecSubgraphOptions {
  readonly branch: ScenarioRuntimeBranch;
  readonly defaultChunkDurationMs?: number;
  readonly functions?: readonly ScenarioFunctionSubgraph[];
}

export interface ExecSubgraphCallbacks {
  readonly onNodeEnter?: (node: ScenarioGraphNode) => void;
}

function findNode(subgraph: ScenarioSubgraph, nodeId: string): ScenarioGraphNode | undefined {
  return subgraph.nodes.find((node) => node.id === nodeId);
}

function findExecSuccessor(subgraph: ScenarioSubgraph, nodeId: string): string | null {
  const edge = subgraph.edges.find(
    (item) =>
      item.source === nodeId &&
      item.kind === 'exec' &&
      item.sourceHandle === 'exec-out' &&
      item.targetHandle === 'exec-in',
  );
  return edge?.target ?? null;
}

/**
 * Один проход exec-цепочки подграфа.
 * Цикл main loop: если следующая нода — entry, завершаем итерацию.
 */
export async function runSubgraphOnce(
  subgraph: ScenarioSubgraph,
  host: ScenarioRuntimeHost,
  signal: AbortSignal,
  options: ExecSubgraphOptions,
  callbacks: ExecSubgraphCallbacks = {},
): Promise<ScenarioDetectionResult | null> {
  let currentId = subgraph.entry;
  const entryId = subgraph.entry;
  let lastDetection: ScenarioDetectionResult | null = null;

  for (;;) {
    if (signal.aborted) {
      return lastDetection;
    }

    const node = findNode(subgraph, currentId);
    if (node === undefined) {
      throw new Error(`Scenario node "${currentId}" not found in ${options.branch}`);
    }

    callbacks.onNodeEnter?.(node);

    const result = await executeScenarioBlock({
      host,
      signal,
      branch: options.branch,
      node,
      lastDetection,
      defaultChunkDurationMs: options.defaultChunkDurationMs ?? 5_000,
      functions: options.functions ?? [],
    });

    if (result.stopRequested) {
      return result.lastDetection;
    }

    lastDetection = result.lastDetection;

    const nextId = findExecSuccessor(subgraph, currentId);
    if (nextId === null) {
      return lastDetection;
    }
    if (nextId === entryId) {
      return lastDetection;
    }

    currentId = nextId;
  }
}
