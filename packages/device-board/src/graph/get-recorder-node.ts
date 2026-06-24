import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * GetRecorder — метод устройства: возвращает singleton RecorderRef для DeviceRef.
 * Ref-provider getter: default pure (data-only); impure — exec passthrough.
 */
export const GET_RECORDER_NODE_KIND = 'get-recorder' as const;

/** Data-вход DeviceRef. */
export const GET_RECORDER_DEVICE_HANDLE = 'device' as const;

/** Data-выход RecorderRef. */
export const GET_RECORDER_OUT_HANDLE = 'recorder' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины GetRecorder: pure (default) — device in, recorder out; impure — + exec. */
export function getRecorderNodePins(pure = true): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  const deviceIn: BoardSocketPin = {
    name: GET_RECORDER_DEVICE_HANDLE,
    kind: 'data',
    socketType: 'DeviceRef',
  };
  const recorderOut: BoardSocketPin = {
    name: GET_RECORDER_OUT_HANDLE,
    kind: 'data',
    socketType: 'RecorderRef',
  };
  if (pure) {
    return { inputs: [deviceIn], outputs: [recorderOut] };
  }
  return {
    inputs: [EXEC_IN, deviceIn],
    outputs: [EXEC_OUT, recorderOut],
  };
}

export interface CreateGetRecorderBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let getRecorderSeq = 0;

/** Фабрика узла GetRecorder. */
export function createGetRecorderBoardNode(
  options: CreateGetRecorderBoardNodeOptions = {},
): Node {
  getRecorderSeq += 1;
  const id = options.id ?? `node-get-recorder-${Date.now().toString(36)}-${getRecorderSeq}`;
  const { inputs, outputs } = getRecorderNodePins();
  const data: BoardFlowNodeData = {
    label: 'GetRecorder',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: GET_RECORDER_NODE_KIND,
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

/** True, если узел — GetRecorder. */
export function isGetRecorderNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === GET_RECORDER_NODE_KIND;
}
