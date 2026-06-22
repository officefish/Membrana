import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** Системный глобальный узел GetDevice — только data-выход, без входов. */
export const DEVICE_GLOBAL_NODE_KIND = 'device-global' as const;

/** Data-выход GetDevice — ссылка на устройство. */
export const DEVICE_GLOBAL_DEVICE_HANDLE = 'device' as const;

/** Пины GetDevice: нет входов, только DeviceRef out. */
export function deviceGlobalNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [],
    outputs: [
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

/** Фабрика системного узла GetDevice. */
export function createDeviceGlobalBoardNode(
  options: CreateDeviceGlobalBoardNodeOptions = {},
): Node {
  deviceGlobalSeq += 1;
  const id = options.id ?? `node-device-global-${Date.now().toString(36)}-${deviceGlobalSeq}`;
  const { inputs, outputs } = deviceGlobalNodePins();
  const data: BoardFlowNodeData = {
    label: 'GetDevice',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: DEVICE_GLOBAL_NODE_KIND,
    system: true,
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

/** True, если узел — GetDevice (device-global). */
export function isDeviceGlobalNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === DEVICE_GLOBAL_NODE_KIND;
}

/** Идемпотентная синхронизация пинов GetDevice после hydrate. */
export function syncDeviceGlobalNodePins(nodes: readonly Node[]): Node[] {
  const { inputs, outputs } = deviceGlobalNodePins();
  return nodes.map((node) => {
    if (!isDeviceGlobalNode(node)) {
      return node;
    }
    return {
      ...node,
      data: {
        ...(node.data as BoardFlowNodeData),
        system: true,
        label: 'GetDevice',
        inputs,
        outputs,
      },
    };
  });
}
