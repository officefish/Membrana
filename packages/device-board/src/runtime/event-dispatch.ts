import type { ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { ON_ASYNC_RESOLVED_NODE_KIND } from '../graph/async-orchestration-nodes.js';
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
  /**
   * AP v1 R8: fire-and-forget — не блокировать вызывающий exec tick.
   * Канон для `on-async-resolved` → drone/report веток.
   */
  readonly detach?: boolean;
}

function findNode(subgraph: ScenarioSubgraph, nodeId: string): ScenarioGraphNode | undefined {
  return subgraph.nodes.find((node) => node.id === nodeId);
}

import { findExecSuccessor } from './exec-successor.js';

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
  const branchStartedAt = performance.now();
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
      onPauseRuntime: options.onPauseRuntime,
      awaitUnpaused: options.awaitUnpaused,
      collectStore: options.collectStore,
      reportStore: options.reportStore,
      trackStore: options.trackStore,
      analysisStore: options.analysisStore,
      fusionStore: options.fusionStore,
      ensembleStore: options.ensembleStore,
      proximityStore: options.proximityStore,
      recordingSliceStore: options.recordingSliceStore,
      asyncJobStore: options.asyncJobStore,
      promiseRuntimeStore: options.promiseRuntimeStore,
      runId: options.runId,
      loopTick: options.loopTick,
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

  host.log('event-branch-done', {
    startNodeId,
    branch: options.branch,
    elapsedMs: Math.round(performance.now() - branchStartedAt),
  });

  return lastDetection;
}

/** True, если event-out данного узла должен dispatch detached (не блокировать tick). */
export function shouldDetachEventDispatch(
  subgraph: ScenarioSubgraph,
  sourceNodeId: string,
): boolean {
  const node = subgraph.nodes.find((item) => item.id === sourceNodeId);
  return node?.nodeKind === ON_ASYNC_RESOLVED_NODE_KIND;
}

/**
 * Multicast event dispatch при flush Collect (DBC5) или on-async-resolved (AP v1).
 * Exec tick источника продолжается по exec-out отдельно; при `detach` — без await.
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

  const detach = input.detach === true;

  input.host.log(detach ? 'event-dispatch-detached-start' : 'collect-event-dispatch', {
    sourceNodeId: input.sourceNodeId,
    eventOutHandle: input.eventOutHandle,
    targets,
    branch: input.options.branch,
  });

  if (detach) {
    void runDispatchCollectEventBranchesSync(input, targets).catch((error: unknown) => {
      input.host.log('event-dispatch-detached-error', {
        sourceNodeId: input.sourceNodeId,
        eventOutHandle: input.eventOutHandle,
        targets,
        branch: input.options.branch,
        message: error instanceof Error ? error.message : String(error),
      });
    });
    return input.lastDetection;
  }

  return runDispatchCollectEventBranchesSync(input, targets);
}

async function runDispatchCollectEventBranchesSync(
  input: DispatchCollectEventBranchesInput,
  targets: readonly string[],
): Promise<ScenarioDetectionResult | null> {
  const dispatchStartedAt = performance.now();
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
  input.host.log(
    input.detach === true ? 'event-dispatch-detached-done' : 'collect-event-dispatch-done',
    {
      sourceNodeId: input.sourceNodeId,
      targets,
      branch: input.options.branch,
      elapsedMs: Math.round(performance.now() - dispatchStartedAt),
    },
  );
  return lastDetection;
}

/** @deprecated Use dispatchCollectEventBranches — kept for grep/docs. */
export const dispatchDetachedEventBranches = (
  input: Omit<DispatchCollectEventBranchesInput, 'detach'>,
): Promise<ScenarioDetectionResult | null> =>
  dispatchCollectEventBranches({ ...input, detach: true });
