import { DEFAULT_RECORDING_POLICY, type ScenarioRecordingPolicy } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** IsRecordingWindowFull — gate по elapsed host recorder vs windowSec. */
export const IS_RECORDING_WINDOW_FULL_NODE_KIND = 'is-recording-window-full' as const;

export const IS_RECORDING_WINDOW_FULL_RECORDER_HANDLE = 'recorder' as const;
export const IS_RECORDING_WINDOW_FULL_WINDOW_SEC_HANDLE = 'windowSec' as const;
/** Совпадает с is-valid exec-true-out (connection-suggest). */
export const IS_RECORDING_WINDOW_FULL_TRUE_HANDLE = 'exec-true-out' as const;
/** Совпадает с is-valid exec-false-out. */
export const IS_RECORDING_WINDOW_FULL_FALSE_HANDLE = 'exec-false-out' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };

/** Пины IsRecordingWindowFull (ветки как у is-valid). */
export function isRecordingWindowFullNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: IS_RECORDING_WINDOW_FULL_RECORDER_HANDLE,
        kind: 'data',
        socketType: 'RecorderRef',
      },
      {
        name: IS_RECORDING_WINDOW_FULL_WINDOW_SEC_HANDLE,
        kind: 'data',
        socketType: 'Integer',
        nullable: true,
      },
    ],
    outputs: [
      { name: IS_RECORDING_WINDOW_FULL_TRUE_HANDLE, kind: 'exec' },
      { name: IS_RECORDING_WINDOW_FULL_FALSE_HANDLE, kind: 'exec' },
    ],
  };
}

export interface CreateIsRecordingWindowFullBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly recordingPolicy?: Partial<ScenarioRecordingPolicy>;
}

let isRecordingWindowFullSeq = 0;

/** Фабрика узла IsRecordingWindowFull. */
export function createIsRecordingWindowFullBoardNode(
  options: CreateIsRecordingWindowFullBoardNodeOptions = {},
): Node {
  isRecordingWindowFullSeq += 1;
  const id =
    options.id ??
    `node-is-recording-window-full-${Date.now().toString(36)}-${isRecordingWindowFullSeq}`;
  const { inputs, outputs } = isRecordingWindowFullNodePins();
  const data: BoardFlowNodeData = {
    label: 'IsRecordingWindowFull',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: IS_RECORDING_WINDOW_FULL_NODE_KIND,
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

/** True, если узел — IsRecordingWindowFull. */
export function isIsRecordingWindowFullNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    node.data.nodeKind === IS_RECORDING_WINDOW_FULL_NODE_KIND
  );
}
