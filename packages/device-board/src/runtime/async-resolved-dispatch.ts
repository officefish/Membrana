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
import { dispatchCollectEventBranches } from './event-dispatch.js';
import type { ExecSubgraphOptions } from './exec-subgraph.js';
import type { ScenarioRuntimeHost } from './host.js';
import { resolveInput } from './resolve-input.js';
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
    const resolveContext = resolveContextByBranch(binding.branch);
    if (resolveContext === undefined) {
      continue;
    }
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

  let lastDetection = input.initialDetection ?? null;
  for (const target of targets) {
    const options = input.execOptions(target.branch);
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
