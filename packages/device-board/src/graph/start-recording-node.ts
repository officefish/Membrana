import { DEFAULT_RECORDING_POLICY, type ScenarioRecordingPolicy } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** StartRecording — подписка RecorderRef на AudioStream с policy окна. */
export const START_RECORDING_NODE_KIND = 'start-recording' as const;

export const START_RECORDING_RECORDER_HANDLE = 'recorder' as const;
export const START_RECORDING_STREAM_HANDLE = 'stream' as const;
export const START_RECORDING_POLICY_HANDLE = 'policy' as const;
export const START_RECORDING_OUT_RECORDER_HANDLE = 'recorder' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины StartRecording. */
export function startRecordingNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: START_RECORDING_RECORDER_HANDLE,
        kind: 'data',
        socketType: 'RecorderRef',
      },
      {
        name: START_RECORDING_STREAM_HANDLE,
        kind: 'data',
        socketType: 'AudioStreamRef',
      },
      {
        name: START_RECORDING_POLICY_HANDLE,
        kind: 'data',
        socketType: 'RecordingPolicy',
        nullable: true,
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: START_RECORDING_OUT_RECORDER_HANDLE,
        kind: 'data',
        socketType: 'RecorderRef',
      },
    ],
  };
}

export interface CreateStartRecordingBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly recordingPolicy?: Partial<ScenarioRecordingPolicy>;
}

let startRecordingSeq = 0;

/** Фабрика узла StartRecording. */
export function createStartRecordingBoardNode(
  options: CreateStartRecordingBoardNodeOptions = {},
): Node {
  startRecordingSeq += 1;
  const id =
    options.id ?? `node-start-recording-${Date.now().toString(36)}-${startRecordingSeq}`;
  const { inputs, outputs } = startRecordingNodePins();
  const data: BoardFlowNodeData = {
    label: 'StartRecording',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: START_RECORDING_NODE_KIND,
    inputs,
    outputs,
    recordingPolicy: {
      ...DEFAULT_RECORDING_POLICY,
      ...options.recordingPolicy,
    },
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — StartRecording. */
export function isStartRecordingNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === START_RECORDING_NODE_KIND
  );
}
