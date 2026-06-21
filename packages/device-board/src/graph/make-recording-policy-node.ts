import {
  DEFAULT_RECORDING_POLICY,
  type ScenarioRecordingPolicy,
} from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** MakeRecordingPolicy — value constructor: конфиг на узле → RecordingPolicy data-out. */
export const MAKE_RECORDING_POLICY_NODE_KIND = 'make-recording-policy' as const;

export const MAKE_RECORDING_POLICY_OUT_HANDLE = 'policy' as const;

/** Пины MakeRecordingPolicy (always pure — без exec). */
export function makeRecordingPolicyNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [],
    outputs: [
      {
        name: MAKE_RECORDING_POLICY_OUT_HANDLE,
        kind: 'data',
        socketType: 'RecordingPolicy',
      },
    ],
  };
}

export interface CreateMakeRecordingPolicyBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly recordingPolicy?: Partial<ScenarioRecordingPolicy>;
}

let makeRecordingPolicySeq = 0;

/** Фабрика узла MakeRecordingPolicy. */
export function createMakeRecordingPolicyBoardNode(
  options: CreateMakeRecordingPolicyBoardNodeOptions = {},
): Node {
  makeRecordingPolicySeq += 1;
  const id =
    options.id ??
    `node-make-recording-policy-${Date.now().toString(36)}-${makeRecordingPolicySeq}`;
  const { inputs, outputs } = makeRecordingPolicyNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeRecordingPolicy',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_RECORDING_POLICY_NODE_KIND,
    inputs,
    outputs,
    recordingPolicy: {
      ...DEFAULT_RECORDING_POLICY,
      ...options.recordingPolicy,
    },
    pure: true,
  };
  return { id, type: 'board', position: options.position ?? { x: 0, y: 0 }, data };
}

/** Type guard nodeKind make-recording-policy. */
export function isMakeRecordingPolicyNodeKind(
  nodeKind: string | undefined,
): nodeKind is typeof MAKE_RECORDING_POLICY_NODE_KIND {
  return nodeKind === MAKE_RECORDING_POLICY_NODE_KIND;
}

/** Читает recordingPolicy из data ноды или ScenarioGraphNode (serialize). */
export function readMakeRecordingPolicyFromNodeData(
  data: Record<string, unknown>,
): Partial<ScenarioRecordingPolicy> | undefined {
  if (isBoardFlowNodeData(data)) {
    return data.recordingPolicy;
  }
  const direct = data.recordingPolicy;
  if (direct !== undefined && typeof direct === 'object') {
    return direct as Partial<ScenarioRecordingPolicy>;
  }
  return undefined;
}
