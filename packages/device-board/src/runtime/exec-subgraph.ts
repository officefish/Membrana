import type { ScenarioFunctionSubgraph, ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import type { ScenarioRuntimeHost } from './host.js';
import type { CollectRuntimeStore } from './collect-runtime-store.js';
import type { ReportRuntimeStore } from './report-runtime-store.js';
import type { TrackRuntimeStore } from './track-runtime-store.js';
import type { RecordingSliceRuntimeStore } from './recording-slice-runtime-store.js';
import type { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { dispatchCollectEventBranches } from './event-dispatch.js';
import type { ResolveInputContext } from './resolve-input.js';
import type { ScenarioDetectionResult } from './types.js';

import type { ScenarioRuntimeBranch } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';
import { isExecTransparentPureNode } from './scenario-node-pure-runtime.js';
import { MAX_SUBGRAPH_EXEC_STEPS, yieldToEventLoop } from './runtime-timing.js';
import { findExecSuccessor } from './exec-successor.js';

export interface RunSubgraphOnceResult {
  readonly lastDetection: ScenarioDetectionResult | null;
  /** Активированный exec-пин function-output при выходе из collapsed function. */
  readonly execOutHandle?: string;
}

export interface ExecSubgraphOptions {
  readonly branch: ScenarioRuntimeBranch;
  readonly defaultChunkDurationMs?: number;
  readonly functions?: readonly ScenarioFunctionSubgraph[];
  /** v0.4 (DBR4): хранилище переменных для variable-set/get. */
  readonly variableStore?: ScenarioVariableStore;
  /** v0.4 (DBR4): контекст pull-резолюции Event/dataflow. */
  readonly resolveContext?: ResolveInputContext;
  readonly onPrintOutput?: (nodeId: string, message: string) => void;
  /** v0.4 device-global StopRuntime. */
  readonly onStopRuntime?: () => void;
  /** v0.7 PauseRuntime node / toolbar freeze. */
  readonly onPauseRuntime?: () => void;
  /** v0.5 DBC3: Collect flush/batch store. */
  readonly collectStore?: CollectRuntimeStore;
  /** v0.6 DBJ3: ReportRef payloads от make-report узлов. */
  readonly reportStore?: ReportRuntimeStore;
  /** v0.6: TrackRef от NewTrack. */
  readonly trackStore?: TrackRuntimeStore;
  /** v0.6: FftTrendAnalysisRef от NewFftTrendsAnalysis. */
  readonly analysisStore?: FftTrendAnalysisRuntimeStore;
  /** v0.7: RecordingSliceRef от StopRecording. */
  readonly recordingSliceStore?: RecordingSliceRuntimeStore;
  /** v0.7: ждать снятия пользовательской паузы. */
  readonly awaitUnpaused?: () => Promise<void>;
}

export interface ExecSubgraphCallbacks {
  readonly onNodeEnter?: (node: ScenarioGraphNode) => void;
}

function findNode(subgraph: ScenarioSubgraph, nodeId: string): ScenarioGraphNode | undefined {
  return subgraph.nodes.find((node) => node.id === nodeId);
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
): Promise<RunSubgraphOnceResult> {
  let currentId = subgraph.entry;
  const entryId = subgraph.entry;
  let lastDetection: ScenarioDetectionResult | null = null;
  let pendingFunctionOutputHandle: string | undefined;
  let execSteps = 0;
  const isLoopBranch = options.branch === 'main' || options.branch === 'alarm';

  const finish = (execOutHandle?: string): RunSubgraphOnceResult => ({
    lastDetection,
    ...(execOutHandle !== undefined ? { execOutHandle } : {}),
  });

  for (;;) {
    if (signal.aborted) {
      return finish();
    }
    if (options.awaitUnpaused !== undefined) {
      await options.awaitUnpaused();
    }
    if (signal.aborted) {
      return finish();
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

    if (node.nodeKind === 'function-output') {
      return finish(pendingFunctionOutputHandle ?? 'exec-out');
    }

    if (node.nodeKind === 'function-input') {
      const execEdge = subgraph.edges.find(
        (item) => item.source === currentId && item.kind === 'exec',
      );
      if (execEdge === undefined) {
        return finish();
      }
      currentId = execEdge.target;
      continue;
    }

    if (isExecTransparentPureNode(node)) {
      const skipNextId = findExecSuccessor(subgraph, currentId, 'exec-out');
      if (skipNextId === null) {
        return finish();
      }
      if (skipNextId === entryId) {
        return finish();
      }
      if (isLoopBranch) {
        await yieldToEventLoop(signal);
      }
      currentId = skipNextId;
      continue;
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
      recordingSliceStore: options.recordingSliceStore,
    });

    if (result.stopRequested) {
      return finish();
    }

    if (result.loopRepeatRequested === true) {
      return finish();
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

    const outgoingHandle = result.execOutHandle ?? 'exec-out';
    const nextId = findExecSuccessor(subgraph, currentId, outgoingHandle);
    if (nextId === null) {
      return finish();
    }
    if (nextId === entryId) {
      return finish();
    }

    const nextNode = findNode(subgraph, nextId);
    pendingFunctionOutputHandle =
      nextNode?.nodeKind === 'function-output' ? outgoingHandle : undefined;

    if (isLoopBranch) {
      if (options.awaitUnpaused !== undefined) {
        await options.awaitUnpaused();
      }
      await yieldToEventLoop(signal);
    }

    currentId = nextId;
  }
}
