/**
 * Promise orchestration nodes (AP v1): palette pins + factories.
 * @see docs/prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md §AP3
 */

import {
  DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG,
  resolveScenarioAsyncJobNodeConfig,
  type ScenarioAsyncJobNodeConfig,
} from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import { COLLECT_EVENT_OUT_HANDLE } from './collect-node-shared.js';

export const START_ASYNC_JOB_NODE_KIND = 'start-async-job' as const;
export const AWAIT_PROMISE_NODE_KIND = 'await-promise' as const;
export const ON_ASYNC_RESOLVED_NODE_KIND = 'on-async-resolved' as const;
export const CANCEL_ASYNC_JOBS_NODE_KIND = 'cancel-async-jobs' as const;

/** Data pin PromiseRef (in/out). */
export const ASYNC_PROMISE_REF_HANDLE = 'promise' as const;

/** Data-in TrackRef для `jobKind: track-upload`. */
export const START_ASYNC_JOB_TRACK_HANDLE = 'track' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

const PROMISE_REF_IN: BoardSocketPin = {
  name: ASYNC_PROMISE_REF_HANDLE,
  kind: 'data',
  socketType: 'PromiseRef',
};

const PROMISE_REF_OUT: BoardSocketPin = {
  name: ASYNC_PROMISE_REF_HANDLE,
  kind: 'data',
  socketType: 'PromiseRef',
};

/** Пины Start Async Job: exec + optional track → promise. */
export function startAsyncJobNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: START_ASYNC_JOB_TRACK_HANDLE,
        kind: 'data',
        socketType: 'TrackRef',
        nullable: true,
      },
    ],
    outputs: [EXEC_OUT, PROMISE_REF_OUT],
  };
}

/** Пины Await Promise: exec + promise in → exec out. */
export function awaitPromiseNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [EXEC_IN, PROMISE_REF_IN],
    outputs: [EXEC_OUT],
  };
}

/** Пины On Async Resolved: promise in → event-out. */
export function onAsyncResolvedNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [PROMISE_REF_IN],
    outputs: [{ name: COLLECT_EVENT_OUT_HANDLE, kind: 'event' }],
  };
}

/** Пины Cancel Async Jobs: exec only. */
export function cancelAsyncJobsNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [EXEC_IN],
    outputs: [EXEC_OUT],
  };
}

export interface CreateAsyncOrchestrationBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly asyncJobConfig?: Partial<ScenarioAsyncJobNodeConfig>;
}

let asyncOrchestrationSeq = 0;

function nextAsyncNodeId(prefix: string): string {
  asyncOrchestrationSeq += 1;
  return `node-${prefix}-${Date.now().toString(36)}-${asyncOrchestrationSeq}`;
}

function buildAsyncNode(
  nodeKind:
    | typeof START_ASYNC_JOB_NODE_KIND
    | typeof AWAIT_PROMISE_NODE_KIND
    | typeof ON_ASYNC_RESOLVED_NODE_KIND
    | typeof CANCEL_ASYNC_JOBS_NODE_KIND,
  label: string,
  pins: { inputs: readonly BoardSocketPin[]; outputs: readonly BoardSocketPin[] },
  options: CreateAsyncOrchestrationBoardNodeOptions,
  asyncJobConfig?: ScenarioAsyncJobNodeConfig,
): Node {
  const id = options.id ?? nextAsyncNodeId(nodeKind);
  const data: BoardFlowNodeData = {
    label,
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind,
    inputs: pins.inputs,
    outputs: pins.outputs,
    ...(asyncJobConfig !== undefined ? { asyncJobConfig } : {}),
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** Фабрика Start Async Job. */
export function createStartAsyncJobBoardNode(
  options: CreateAsyncOrchestrationBoardNodeOptions = {},
): Node {
  const asyncJobConfig = resolveScenarioAsyncJobNodeConfig({
    ...DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG,
    ...options.asyncJobConfig,
  });
  return buildAsyncNode(
    START_ASYNC_JOB_NODE_KIND,
    'Start Async Job',
    startAsyncJobNodePins(),
    options,
    asyncJobConfig,
  );
}

/** Фабрика Await Promise. */
export function createAwaitPromiseBoardNode(
  options: CreateAsyncOrchestrationBoardNodeOptions = {},
): Node {
  const asyncJobConfig = resolveScenarioAsyncJobNodeConfig({
    ...DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG,
    ...options.asyncJobConfig,
  });
  return buildAsyncNode(
    AWAIT_PROMISE_NODE_KIND,
    'Await Promise',
    awaitPromiseNodePins(),
    options,
    asyncJobConfig,
  );
}

/** Фабрика On Async Resolved. */
export function createOnAsyncResolvedBoardNode(
  options: CreateAsyncOrchestrationBoardNodeOptions = {},
): Node {
  return buildAsyncNode(
    ON_ASYNC_RESOLVED_NODE_KIND,
    'On Async Resolved',
    onAsyncResolvedNodePins(),
    options,
  );
}

/** Фабрика Cancel Async Jobs. */
export function createCancelAsyncJobsBoardNode(
  options: CreateAsyncOrchestrationBoardNodeOptions = {},
): Node {
  const asyncJobConfig = resolveScenarioAsyncJobNodeConfig({
    ...DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG,
    ...options.asyncJobConfig,
  });
  return buildAsyncNode(
    CANCEL_ASYNC_JOBS_NODE_KIND,
    'Cancel Async Jobs',
    cancelAsyncJobsNodePins(),
    options,
    asyncJobConfig,
  );
}

/** True, если узел — один из promise orchestration kinds. */
export function isAsyncOrchestrationNode(node: Node): boolean {
  if (!isBoardFlowNodeData(node.data)) {
    return false;
  }
  const kind = node.data.nodeKind;
  return (
    kind === START_ASYNC_JOB_NODE_KIND ||
    kind === AWAIT_PROMISE_NODE_KIND ||
    kind === ON_ASYNC_RESOLVED_NODE_KIND ||
    kind === CANCEL_ASYNC_JOBS_NODE_KIND
  );
}

/** Читает asyncJobConfig из data ноды. */
export function readAsyncJobNodeConfig(
  source: Pick<BoardFlowNodeData, 'asyncJobConfig'> | { readonly asyncJobConfig?: ScenarioAsyncJobNodeConfig },
): ScenarioAsyncJobNodeConfig {
  return resolveScenarioAsyncJobNodeConfig(source.asyncJobConfig);
}
