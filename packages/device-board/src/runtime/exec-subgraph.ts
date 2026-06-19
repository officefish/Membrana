import type { ScenarioFunctionSubgraph, ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import type { ScenarioRuntimeHost } from './host.js';
import type { ResolveInputContext } from './resolve-input.js';
import type { ScenarioDetectionResult } from './types.js';

import type { ScenarioRuntimeBranch } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';
import { MAX_SUBGRAPH_EXEC_STEPS, yieldToEventLoop } from './runtime-timing.js';

export interface ExecSubgraphOptions {
  readonly branch: ScenarioRuntimeBranch;
  readonly defaultChunkDurationMs?: number;
  readonly functions?: readonly ScenarioFunctionSubgraph[];
  /** v0.4 (DBR4): хранилище переменных для variable-set/get. */
  readonly variableStore?: ScenarioVariableStore;
  /** v0.4 (DBR4): контекст pull-резолюции Event/dataflow. */
  readonly resolveContext?: ResolveInputContext;
}

export interface ExecSubgraphCallbacks {
  readonly onNodeEnter?: (node: ScenarioGraphNode) => void;
}

function findNode(subgraph: ScenarioSubgraph, nodeId: string): ScenarioGraphNode | undefined {
  return subgraph.nodes.find((node) => node.id === nodeId);
}

function findExecSuccessor(
  subgraph: ScenarioSubgraph,
  nodeId: string,
  sourceHandle = 'exec-out',
): string | null {
  const edge = subgraph.edges.find(
    (item) =>
      item.source === nodeId &&
      item.kind === 'exec' &&
      item.sourceHandle === sourceHandle &&
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
  let execSteps = 0;
  const isLoopBranch = options.branch === 'main' || options.branch === 'alarm';

  for (;;) {
    if (signal.aborted) {
      return lastDetection;
    }

    execSteps += 1;
    if (execSteps > MAX_SUBGRAPH_EXEC_STEPS) {
      throw new Error(
        `Scenario subgraph "${options.branch}" exceeded ${MAX_SUBGRAPH_EXEC_STEPS} exec steps — проверьте цикл (нужен узел ∞)`,
      );
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
      subgraph,
      node,
      lastDetection,
      defaultChunkDurationMs: options.defaultChunkDurationMs ?? 5_000,
      functions: options.functions ?? [],
      variableStore: options.variableStore,
      resolveContext: options.resolveContext,
    });

    if (result.stopRequested) {
      return result.lastDetection;
    }

    if (result.loopRepeatRequested === true) {
      return result.lastDetection;
    }

    lastDetection = result.lastDetection;

    const nextId = findExecSuccessor(subgraph, currentId, result.execOutHandle ?? 'exec-out');
    if (nextId === null) {
      return lastDetection;
    }
    if (nextId === entryId) {
      return lastDetection;
    }

    if (isLoopBranch) {
      await yieldToEventLoop(signal);
    }

    currentId = nextId;
  }
}
