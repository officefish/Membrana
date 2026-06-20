import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** Узел StopRuntime — останавливает scenario runtime (возврат в edit). */
export const STOP_RUNTIME_NODE_KIND = 'stop-runtime' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };

/** Пины узла StopRuntime (exec-терминал). */
export function stopRuntimeNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [EXEC_IN],
    outputs: [],
  };
}

export interface CreateStopRuntimeBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let stopRuntimeSeq = 0;

/** Фабрика узла StopRuntime. */
export function createStopRuntimeBoardNode(
  options: CreateStopRuntimeBoardNodeOptions = {},
): Node {
  stopRuntimeSeq += 1;
  const id = options.id ?? `node-stop-runtime-${Date.now().toString(36)}-${stopRuntimeSeq}`;
  const { inputs, outputs } = stopRuntimeNodePins();
  const data: BoardFlowNodeData = {
    label: 'StopRuntime',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: STOP_RUNTIME_NODE_KIND,
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

/** True, если узел — StopRuntime. */
export function isStopRuntimeNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === STOP_RUNTIME_NODE_KIND;
}
