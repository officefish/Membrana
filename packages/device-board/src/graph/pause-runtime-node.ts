import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * PauseRuntime — замораживает scenario runtime без onStop (DBP2).
 * Exec продолжается после Resume в toolbar.
 */
export const PAUSE_RUNTIME_NODE_KIND = 'pause-runtime' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };

/** Пины PauseRuntime: только exec-in. */
export function pauseRuntimeNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [EXEC_IN],
    outputs: [{ name: 'exec-out', kind: 'exec' }],
  };
}

export interface CreatePauseRuntimeBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let pauseRuntimeSeq = 0;

/** Фабрика узла PauseRuntime. */
export function createPauseRuntimeBoardNode(
  options: CreatePauseRuntimeBoardNodeOptions = {},
): Node {
  pauseRuntimeSeq += 1;
  const id = options.id ?? `node-pause-runtime-${Date.now().toString(36)}-${pauseRuntimeSeq}`;
  const { inputs, outputs } = pauseRuntimeNodePins();
  const data: BoardFlowNodeData = {
    label: 'PauseRuntime',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: PAUSE_RUNTIME_NODE_KIND,
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

/** True, если узел — PauseRuntime. */
export function isPauseRuntimeNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === PAUSE_RUNTIME_NODE_KIND;
}
