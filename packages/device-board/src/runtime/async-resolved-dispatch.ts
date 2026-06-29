import type {
  DeviceScenarioDocument,
  ScenarioAsyncJobCorrelation,
  ScenarioAsyncJobKind,
  ScenarioAsyncJobRecord,
  ScenarioGraphNode,
  ScenarioSubgraph,
  ScenarioAsyncJobNodeConfig,
} from '@membrana/core';
import { parsePromiseRefHandle, resolveScenarioAsyncJobNodeConfig } from '@membrana/core';

import { COLLECT_EVENT_OUT_HANDLE } from '../graph/collect-node-shared.js';
import {
  ASYNC_PROMISE_REF_HANDLE,
  ON_ASYNC_RESOLVED_NODE_KIND,
} from '../graph/async-orchestration-nodes.js';
import { parseSubgraphFunctionId } from '../graph/subgraph-ref.js';
import { dispatchCollectEventBranches } from './event-dispatch.js';
import type { ExecSubgraphOptions } from './exec-subgraph.js';
import { augmentResolveContextForFunctionCall } from './function-call-resolve.js';
import type { ScenarioRuntimeHost } from './host.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import type { PromiseRuntimeStore } from './promise-runtime-store.js';
import type { ScenarioDetectionResult } from './types.js';
import type { ScenarioRuntimeBranch } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';

export interface AsyncResolvedTarget {
  readonly branch: ScenarioRuntimeBranch;
  readonly subgraph: ScenarioSubgraph;
  readonly nodeId: string;
}

interface SubgraphBranchBinding {
  readonly branch: ScenarioRuntimeBranch;
  readonly subgraph: ScenarioSubgraph;
}

interface FunctionBlockBinding {
  readonly branch: ScenarioRuntimeBranch;
  readonly parentSubgraph: ScenarioSubgraph;
  readonly blockNodeId: string;
}

function findFunctionIdForSubgraph(
  document: DeviceScenarioDocument,
  subgraph: ScenarioSubgraph,
): string | null {
  const fn = document.scenario.functions.find((item) => item.entry === subgraph.entry);
  return fn?.id ?? null;
}

function findFunctionBlockBindings(
  document: DeviceScenarioDocument,
  functionId: string,
): readonly FunctionBlockBinding[] {
  const bindings: FunctionBlockBinding[] = [];
  const { scenario } = document;
  const branches: ReadonlyArray<readonly [ScenarioRuntimeBranch, ScenarioSubgraph]> = [
    ['initial', scenario.initial],
    ['main', scenario.loops.main],
    ['alarm', scenario.loops.alarm],
    ['onStop', scenario.triggers.onStop],
    ['onDisconnect', scenario.triggers.onDisconnect],
  ];
  for (const [branch, parentSubgraph] of branches) {
    for (const node of parentSubgraph.nodes) {
      if (node.blockKind !== 'subgraph') {
        continue;
      }
      if (parseSubgraphFunctionId(node) === functionId) {
        bindings.push({ branch, parentSubgraph, blockNodeId: node.id });
      }
    }
  }
  return bindings;
}

/** Collapsed user functions: bridge parent block data pins into async-resolved paths. */
function augmentResolveContextForFunctionSubgraphTarget(
  document: DeviceScenarioDocument,
  binding: SubgraphBranchBinding,
  variableStore: ScenarioVariableStore,
  baseContext: ResolveInputContext | undefined,
): ResolveInputContext | undefined {
  if (baseContext === undefined) {
    return undefined;
  }
  const functionId = findFunctionIdForSubgraph(document, binding.subgraph);
  if (functionId === null) {
    return baseContext;
  }
  const blockBindings = findFunctionBlockBindings(document, functionId);
  if (blockBindings.length === 0) {
    return baseContext;
  }
  const blockBinding =
    blockBindings.find((item) => item.branch === binding.branch) ?? blockBindings[0]!;
  return augmentResolveContextForFunctionCall({
    parentSubgraph: blockBinding.parentSubgraph,
    blockNodeId: blockBinding.blockNodeId,
    variables: variableStore.getAll(),
    baseContext,
  });
}

/** Collapsed user functions: bridge parent block data pins into detached async dispatch. */
function augmentExecOptionsForFunctionSubgraph(
  document: DeviceScenarioDocument,
  target: AsyncResolvedTarget,
  baseOptions: ExecSubgraphOptions,
): ExecSubgraphOptions {
  const variableStore = baseOptions.variableStore;
  if (variableStore === undefined) {
    return baseOptions;
  }
  const resolveContext = augmentResolveContextForFunctionSubgraphTarget(
    document,
    { branch: target.branch, subgraph: target.subgraph },
    variableStore,
    baseOptions.resolveContext,
  );
  if (resolveContext === baseOptions.resolveContext) {
    return baseOptions;
  }
  return {
    ...baseOptions,
    functions: document.scenario.functions,
    resolveContext,
  };
}

function collectSubgraphBindings(document: DeviceScenarioDocument): readonly SubgraphBranchBinding[] {
  const { scenario } = document;
  return [
    { branch: 'initial', subgraph: scenario.initial },
    { branch: 'main', subgraph: scenario.loops.main },
    { branch: 'alarm', subgraph: scenario.loops.alarm },
    { branch: 'onStop', subgraph: scenario.triggers.onStop },
    { branch: 'onDisconnect', subgraph: scenario.triggers.onDisconnect },
    ...scenario.functions.map(
      (fn): SubgraphBranchBinding => ({
        branch: 'main',
        subgraph: fn,
      }),
    ),
  ];
}

/** Находит on-async-resolved узлы, слушающие данный promiseId. */
export function findAsyncResolvedTargets(
  document: DeviceScenarioDocument,
  kind: ScenarioAsyncJobKind,
  promiseId: string,
  variableStore: ScenarioVariableStore,
  promiseRuntimeStore: PromiseRuntimeStore,
  resolveContextByBranch: (branch: ScenarioRuntimeBranch) => ExecSubgraphOptions['resolveContext'],
): readonly AsyncResolvedTarget[] {
  const targets: AsyncResolvedTarget[] = [];

  for (const binding of collectSubgraphBindings(document)) {
    const baseContext = resolveContextByBranch(binding.branch);
    if (baseContext === undefined) {
      continue;
    }
    const resolveContext = augmentResolveContextForFunctionSubgraphTarget(
      document,
      binding,
      variableStore,
      baseContext,
    );
    const augmented = {
      ...resolveContext,
      getPromiseRef: (nodeId: string) => promiseRuntimeStore.getPromiseRef(nodeId),
    };

    for (const node of binding.subgraph.nodes) {
      if (node.nodeKind !== ON_ASYNC_RESOLVED_NODE_KIND) {
        continue;
      }
      const ref = resolveInput(
        binding.subgraph,
        variableStore.getAll(),
        node.id,
        ASYNC_PROMISE_REF_HANDLE,
        augmented,
      );
      if (ref === null || ref.kind !== 'PromiseRef' || ref.handle === null) {
        continue;
      }
      const parsed = parsePromiseRefHandle(ref.handle);
      if (parsed === null || parsed.kind !== kind || parsed.promiseId !== promiseId) {
        continue;
      }
      targets.push({
        branch: binding.branch,
        subgraph: binding.subgraph,
        nodeId: node.id,
      });
    }
  }

  return targets;
}

export interface DispatchAsyncResolvedBranchesInput {
  readonly document: DeviceScenarioDocument;
  readonly record: ScenarioAsyncJobRecord;
  readonly host: ScenarioRuntimeHost;
  readonly signal: AbortSignal;
  readonly variableStore: ScenarioVariableStore;
  readonly promiseRuntimeStore: PromiseRuntimeStore;
  readonly execOptions: (branch: ScenarioRuntimeBranch) => ExecSubgraphOptions;
  readonly onNodeEnter?: (branch: ScenarioRuntimeBranch, node: ScenarioGraphNode) => void;
  readonly initialDetection?: ScenarioDetectionResult | null;
}

/** Multicast event-out веток on-async-resolved при resolve job (AP v1). */
export async function dispatchAsyncResolvedBranches(
  input: DispatchAsyncResolvedBranchesInput,
): Promise<void> {
  if (input.record.state !== 'resolved') {
    return;
  }

  const targets = findAsyncResolvedTargets(
    input.document,
    input.record.kind,
    input.record.promiseId,
    input.variableStore,
    input.promiseRuntimeStore,
    (branch) => input.execOptions(branch).resolveContext,
  );

  if (targets.length === 0) {
    return;
  }

  input.host.log('async-resolved-dispatch', {
    promiseId: input.record.promiseId,
    kind: input.record.kind,
    targets: targets.map((target) => target.nodeId),
  });

  const lastDetection = input.initialDetection ?? null;
  for (const target of targets) {
    const options = augmentExecOptionsForFunctionSubgraph(
      input.document,
      target,
      input.execOptions(target.branch),
    );
    void dispatchCollectEventBranches({
      subgraph: target.subgraph,
      sourceNodeId: target.nodeId,
      eventOutHandle: COLLECT_EVENT_OUT_HANDLE,
      host: input.host,
      signal: input.signal,
      options,
      callbacks: {
        onNodeEnter: (node) => input.onNodeEnter?.(target.branch, node),
      },
      lastDetection,
      detach: true,
    });
  }

  input.host.log('async-resolved-dispatch-done', {
    promiseId: input.record.promiseId,
    kind: input.record.kind,
    targetCount: targets.length,
  });
}

export interface WireAsyncResolvedDispatchInput {
  readonly document: DeviceScenarioDocument;
  readonly host: ScenarioRuntimeHost;
  readonly variableStore: ScenarioVariableStore;
  readonly promiseRuntimeStore: PromiseRuntimeStore;
  readonly subscribe: (listener: (record: ScenarioAsyncJobRecord) => void) => () => void;
  readonly getSignal: () => AbortSignal | null;
  readonly execOptions: (branch: ScenarioRuntimeBranch) => ExecSubgraphOptions;
  readonly onNodeEnter?: (branch: ScenarioRuntimeBranch, node: ScenarioGraphNode) => void;
}

/** Подписка store → fire-and-forget dispatch on-async-resolved (non-blocking main tick). */
export function wireAsyncResolvedDispatch(input: WireAsyncResolvedDispatchInput): () => void {
  return input.subscribe((record) => {
    if (record.state !== 'resolved') {
      return;
    }
    const signal = input.getSignal();
    if (signal === null || signal.aborted) {
      return;
    }
    void dispatchAsyncResolvedBranches({
      document: input.document,
      record,
      host: input.host,
      signal,
      variableStore: input.variableStore,
      promiseRuntimeStore: input.promiseRuntimeStore,
      execOptions: input.execOptions,
      onNodeEnter: input.onNodeEnter,
    }).catch((error: unknown) => {
      input.host.log('async-resolved-dispatch-error', {
        promiseId: record.promiseId,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

/** Читает asyncJobConfig с ScenarioGraphNode. */
export function readGraphNodeAsyncJobConfig(node: ScenarioGraphNode): ScenarioAsyncJobNodeConfig {
  const raw = (node as ScenarioGraphNode & { asyncJobConfig?: unknown }).asyncJobConfig;
  return resolveScenarioAsyncJobNodeConfig(
    raw !== undefined && raw !== null && typeof raw === 'object'
      ? (raw as Parameters<typeof resolveScenarioAsyncJobNodeConfig>[0])
      : undefined,
  );
}

/** Строит correlation для async job. */
export function buildAsyncJobCorrelation(input: {
  readonly runId: string;
  readonly branch: ScenarioRuntimeBranch;
  readonly nodeId: string;
  readonly tick?: number;
}): ScenarioAsyncJobCorrelation {
  return {
    runId: input.runId,
    branch: input.branch,
    nodeId: input.nodeId,
    tick: input.tick,
    startedAtMs: Date.now(),
  };
}
