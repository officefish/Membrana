import type { ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import type { ScenarioRuntimeHost } from './host.js';
import type { ExecSubgraphCallbacks, ExecSubgraphOptions } from './exec-subgraph.js';
import type { ScenarioDetectionResult } from './types.js';
import { MAX_SUBGRAPH_EXEC_STEPS } from './runtime-timing.js';

export interface DispatchCollectEventBranchesInput {
  readonly subgraph: ScenarioSubgraph;
  readonly sourceNodeId: string;
  readonly eventOutHandle: string;
  readonly host: ScenarioRuntimeHost;
  readonly signal: AbortSignal;
  readonly options: ExecSubgraphOptions;
  readonly callbacks: ExecSubgraphCallbacks;
  readonly lastDetection: ScenarioDetectionResult | null;
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

/** Цели event-ветки: `event-out` Collect → exec-in downstream. */
export function findEventBranchTargets(
  subgraph: ScenarioSubgraph,
  sourceNodeId: string,
  eventOutHandle: string,
): readonly string[] {
  return subgraph.edges
    .filter(
      (edge) =>
        edge.kind === 'event' &&
        edge.source === sourceNodeId &&
        edge.sourceHandle === eventOutHandle &&
        edge.targetHandle === 'exec-in',
    )
    .map((edge) => edge.target);
}

/**
 * Исполняет exec-цепочку event-ветки от `startNodeId` до terminal (нет exec-out).
 * Не возвращается в main exec tick Collect-узла.
 */
export async function runEventBranchFromNode(
  subgraph: ScenarioSubgraph,
  startNodeId: string,
  host: ScenarioRuntimeHost,
  signal: AbortSignal,
  options: ExecSubgraphOptions,
  callbacks: ExecSubgraphCallbacks,
  initialDetection: ScenarioDetectionResult | null,
): Promise<ScenarioDetectionResult | null> {
  let currentId: string | null = startNodeId;
  let lastDetection = initialDetection;
  let steps = 0;

  while (currentId !== null) {
    if (signal.aborted) {
      return lastDetection;
    }

    steps += 1;
    if (steps > MAX_SUBGRAPH_EXEC_STEPS) {
      throw new Error(
        `Event branch from "${startNodeId}" exceeded ${MAX_SUBGRAPH_EXEC_STEPS} exec steps`,
      );
    }

    const node = findNode(subgraph, currentId);
    if (node === undefined) {
      throw new Error(`Event branch node "${currentId}" not found`);
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
      onPrintOutput: options.onPrintOutput,
      onStopRuntime: options.onStopRuntime,
      collectStore: options.collectStore,
    });

    if (result.stopRequested) {
      return result.lastDetection;
    }

    lastDetection = result.lastDetection;

    if (result.eventOutHandle !== undefined) {
      lastDetection = await dispatchCollectEventBranches({
        subgraph,
        sourceNodeId: currentId,
        eventOutHandle: result.eventOutHandle,
        host,
        signal,
        options,
        callbacks,
        lastDetection,
      });
    }

    currentId = findExecSuccessor(subgraph, currentId, result.execOutHandle ?? 'exec-out');
  }

  return lastDetection;
}

/**
 * Multicast event dispatch при flush Collect (DBC5).
 * Exec tick Collect продолжается по exec-out отдельно.
 */
export async function dispatchCollectEventBranches(
  input: DispatchCollectEventBranchesInput,
): Promise<ScenarioDetectionResult | null> {
  const targets = findEventBranchTargets(
    input.subgraph,
    input.sourceNodeId,
    input.eventOutHandle,
  );
  if (targets.length === 0) {
    return input.lastDetection;
  }

  input.host.log('collect-event-dispatch', {
    sourceNodeId: input.sourceNodeId,
    eventOutHandle: input.eventOutHandle,
    targets,
    branch: input.options.branch,
  });

  let lastDetection = input.lastDetection;
  for (const targetId of targets) {
    lastDetection = await runEventBranchFromNode(
      input.subgraph,
      targetId,
      input.host,
      input.signal,
      input.options,
      input.callbacks,
      lastDetection,
    );
  }
  return lastDetection;
}
