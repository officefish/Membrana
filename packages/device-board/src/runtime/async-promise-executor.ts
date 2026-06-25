import type { ScenarioGraphNode, ScenarioReferenceValue, ScenarioSubgraph } from '@membrana/core';
import { DEFAULT_SCENARIO_ASYNC_JOB_AWAIT_TIMEOUT_MS, parsePromiseRefHandle } from '@membrana/core';

import {
  ASYNC_PROMISE_REF_HANDLE,
  AWAIT_PROMISE_NODE_KIND,
  CANCEL_ASYNC_JOBS_NODE_KIND,
  START_ASYNC_JOB_NODE_KIND,
  START_ASYNC_JOB_TRACK_HANDLE,
} from '../graph/async-orchestration-nodes.js';
import type { AsyncJobStore } from './async-job-store.js';
import {
  buildAsyncJobCorrelation,
  readGraphNodeAsyncJobConfig,
} from './async-resolved-dispatch.js';
import type { ScenarioRuntimeHost } from './host.js';
import type { PromiseRuntimeStore } from './promise-runtime-store.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import { isReferenceValid } from './reference-validity.js';
import type { ScenarioRuntimeBranch } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';
import { waitForAsyncJobTerminal } from './wait-for-async-job.js';

export interface ExecuteAsyncPromiseNodeInput {
  readonly host: ScenarioRuntimeHost;
  readonly signal: AbortSignal;
  readonly branch: ScenarioRuntimeBranch;
  readonly subgraph: ScenarioSubgraph;
  readonly node: ScenarioGraphNode;
  readonly runId: string;
  readonly loopTick?: number;
  readonly variableStore?: ScenarioVariableStore;
  readonly resolveContext?: ResolveInputContext;
  readonly asyncJobStore?: AsyncJobStore;
  readonly promiseRuntimeStore?: PromiseRuntimeStore;
}

function createPromiseId(nodeId: string): string {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? `${Date.now().toString(36)}`;
  return `${nodeId}-${suffix}`;
}

/** Start Async Job: register job, expose PromiseRef, optional host bridge (R7). */
export async function executeStartAsyncJob(
  input: ExecuteAsyncPromiseNodeInput,
): Promise<void> {
  const { host, node, asyncJobStore, promiseRuntimeStore } = input;
  if (asyncJobStore === undefined || promiseRuntimeStore === undefined) {
    throw new Error('start-async-job requires asyncJobStore and promiseRuntimeStore');
  }

  const config = readGraphNodeAsyncJobConfig(node);
  const promiseId = createPromiseId(node.id);
  const correlation = buildAsyncJobCorrelation({
    runId: input.runId,
    branch: input.branch,
    nodeId: node.id,
    tick: input.loopTick,
  });

  let trackRef: ScenarioReferenceValue | null = null;
  if (
    input.variableStore !== undefined &&
    input.resolveContext !== undefined &&
    config.jobKind === 'track-upload'
  ) {
    const resolved = resolveInput(
      input.subgraph,
      input.variableStore.getAll(),
      node.id,
      START_ASYNC_JOB_TRACK_HANDLE,
      input.resolveContext,
    );
    if (resolved !== null && resolved.kind === 'TrackRef' && isReferenceValid(resolved)) {
      trackRef = resolved;
    }
  }

  const record = asyncJobStore.register({
    promiseId,
    kind: config.jobKind,
    correlation,
  });
  promiseRuntimeStore.setNodePromise(node.id, config.jobKind, promiseId);

  host.log('async-job-start', {
    promiseId,
    kind: config.jobKind,
    nodeId: node.id,
    branch: input.branch,
    runId: input.runId,
    state: record.state,
  });

  if (host.startAsyncJob !== undefined) {
    await host.startAsyncJob({
      promiseId,
      kind: config.jobKind,
      correlation,
      trackRef,
      asyncJobStore,
    });
  }
}

/** Await Promise: блокирует exec-цепочку до terminal state / timeout. */
export async function executeAwaitPromise(input: ExecuteAsyncPromiseNodeInput): Promise<void> {
  const { host, node, signal, asyncJobStore } = input;
  if (asyncJobStore === undefined) {
    throw new Error('await-promise requires asyncJobStore');
  }
  if (input.variableStore === undefined || input.resolveContext === undefined) {
    throw new Error('await-promise requires variableStore and resolveContext');
  }

  const config = readGraphNodeAsyncJobConfig(node);
  const timeoutMs = config.awaitTimeoutMs ?? DEFAULT_SCENARIO_ASYNC_JOB_AWAIT_TIMEOUT_MS;
  const promiseRef = resolveInput(
    input.subgraph,
    input.variableStore.getAll(),
    node.id,
    ASYNC_PROMISE_REF_HANDLE,
    {
      ...input.resolveContext,
      getPromiseRef:
        input.promiseRuntimeStore !== undefined
          ? (nodeId) => input.promiseRuntimeStore!.getPromiseRef(nodeId)
          : input.resolveContext.getPromiseRef,
    },
  );

  if (promiseRef === null || promiseRef.kind !== 'PromiseRef' || promiseRef.handle === null) {
    host.log('promise-await-skipped', {
      nodeId: node.id,
      reason: 'missing-promise-ref',
    });
    return;
  }

  const parsed = parsePromiseRefHandle(promiseRef.handle);
  if (parsed === null) {
    host.log('promise-await-skipped', {
      nodeId: node.id,
      reason: 'invalid-promise-handle',
      handle: promiseRef.handle,
    });
    return;
  }

  host.log('promise-await-start', {
    nodeId: node.id,
    promiseId: parsed.promiseId,
    kind: parsed.kind,
    timeoutMs,
  });

  const startedAt = performance.now();
  const terminal = await waitForAsyncJobTerminal(
    asyncJobStore,
    parsed.promiseId,
    timeoutMs,
    signal,
  );

  host.log('promise-await-done', {
    nodeId: node.id,
    promiseId: parsed.promiseId,
    state: terminal.state,
    elapsedMs: Math.round(performance.now() - startedAt),
    ...(terminal.errorMessage !== undefined ? { errorMessage: terminal.errorMessage } : {}),
  });
}

/** Cancel Async Jobs: отменяет pending jobs по jobKind filter. */
export function executeCancelAsyncJobs(input: ExecuteAsyncPromiseNodeInput): void {
  const { host, node, asyncJobStore } = input;
  if (asyncJobStore === undefined) {
    throw new Error('cancel-async-jobs requires asyncJobStore');
  }

  const config = readGraphNodeAsyncJobConfig(node);
  const cancelled = asyncJobStore.cancelByKind(config.jobKind, input.runId);

  host.log('async-job-cancelled', {
    nodeId: node.id,
    kind: config.jobKind,
    runId: input.runId,
    count: cancelled.length,
    promiseIds: cancelled.map((job) => job.promiseId),
  });
}

/** Dispatch async orchestration node kinds from block-executor. */
export async function executeAsyncOrchestrationNode(
  input: ExecuteAsyncPromiseNodeInput,
): Promise<void> {
  const kind = input.node.nodeKind;
  if (kind === START_ASYNC_JOB_NODE_KIND) {
    await executeStartAsyncJob(input);
    return;
  }
  if (kind === AWAIT_PROMISE_NODE_KIND) {
    await executeAwaitPromise(input);
    return;
  }
  if (kind === CANCEL_ASYNC_JOBS_NODE_KIND) {
    executeCancelAsyncJobs(input);
    return;
  }
}
