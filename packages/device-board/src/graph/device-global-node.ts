import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** Глобальный узел Device: GetDevice (DeviceRef data out + exec passthrough). */
export const DEVICE_GLOBAL_NODE_KIND = 'device-global' as const;

/** Data-выход GetDevice — ссылка на устройство (как у Event). */
export const DEVICE_GLOBAL_DEVICE_HANDLE = 'device' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины глобального узла Device. */
export function deviceGlobalNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [EXEC_IN],
    outputs: [
      EXEC_OUT,
      {
        name: DEVICE_GLOBAL_DEVICE_HANDLE,
        kind: 'data',
        socketType: 'DeviceRef',
      },
    ],
  };
}

export interface CreateDeviceGlobalBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let deviceGlobalSeq = 0;

/** Фабрика глобального узла Device (GetDevice). */
export function createDeviceGlobalBoardNode(
  options: CreateDeviceGlobalBoardNodeOptions = {},
): Node {
  deviceGlobalSeq += 1;
  const id = options.id ?? `node-device-global-${Date.now().toString(36)}-${deviceGlobalSeq}`;
  const { inputs, outputs } = deviceGlobalNodePins();
  const data: BoardFlowNodeData = {
    label: 'Device',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: DEVICE_GLOBAL_NODE_KIND,
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

/** True, если узел — глобальный Device. */
export function isDeviceGlobalNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === DEVICE_GLOBAL_NODE_KIND;
}
