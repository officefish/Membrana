import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** StopRecording — снимок PCM окна → RecordingSliceRef. */
export const STOP_RECORDING_NODE_KIND = 'stop-recording' as const;

export const STOP_RECORDING_RECORDER_HANDLE = 'recorder' as const;
export const STOP_RECORDING_SLICE_HANDLE = 'slice' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины StopRecording. */
export function stopRecordingNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: STOP_RECORDING_RECORDER_HANDLE,
        kind: 'data',
        socketType: 'RecorderRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: STOP_RECORDING_SLICE_HANDLE,
        kind: 'data',
        socketType: 'RecordingSliceRef',
      },
    ],
  };
}

export interface CreateStopRecordingBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let stopRecordingSeq = 0;

/** Фабрика узла StopRecording. */
export function createStopRecordingBoardNode(
  options: CreateStopRecordingBoardNodeOptions = {},
): Node {
  stopRecordingSeq += 1;
  const id = options.id ?? `node-stop-recording-${Date.now().toString(36)}-${stopRecordingSeq}`;
  const { inputs, outputs } = stopRecordingNodePins();
  const data: BoardFlowNodeData = {
    label: 'StopRecording',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: STOP_RECORDING_NODE_KIND,
    inputs,
    outputs,
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — StopRecording. */
export function isStopRecordingNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === STOP_RECORDING_NODE_KIND;
}
