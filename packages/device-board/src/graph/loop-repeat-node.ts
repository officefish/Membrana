import type { Edge, Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** Вид системного узла «новый цикл лупа». */
export const LOOP_REPEAT_NODE_KIND = 'loop-repeat' as const;

/** Имя exec-входа — терминал цепочки; достижение = конец итерации. */
export const LOOP_REPEAT_EXEC_IN = 'exec-in' as const;

const EXEC_IN: BoardSocketPin = { name: LOOP_REPEAT_EXEC_IN, kind: 'exec' };

export interface CreateLoopRepeatBoardNodeOptions {
  readonly id: string;
  readonly label?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

/**
 * Фабрика системного узла loop-repeat (∞): exec-терминал лупа.
 * Runtime завершает итерацию при входе на этот узел.
 */
export function createLoopRepeatBoardNode(options: CreateLoopRepeatBoardNodeOptions): Node {
  const data: BoardFlowNodeData = {
    label: options.label ?? '∞',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: LOOP_REPEAT_NODE_KIND,
    system: true,
    inputs: [EXEC_IN],
    outputs: [],
  };
  return {
    id: options.id,
    type: 'board',
    position: options.position ?? { x: 720, y: 160 },
    deletable: false,
    data,
  };
}

/** True, если нода — системный loop-repeat. */
export function isLoopRepeatNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === LOOP_REPEAT_NODE_KIND;
}

/**
 * Гарантирует loop-repeat в лупе и перенаправляет legacy loop-back на onTick → ∞.
 */
export function ensureLoopInfinity(
  infinityId: string,
  tickEntryId: string,
  nodes: readonly Node[],
  edges: readonly Edge[],
): { readonly nodes: Node[]; readonly edges: Edge[] } {
  const hasInfinity = nodes.some((node) => node.id === infinityId && isLoopRepeatNode(node));
  const nextNodes = hasInfinity
    ? [...nodes]
    : [...nodes, createLoopRepeatBoardNode({ id: infinityId, position: { x: 720, y: 160 } })];

  const nextEdges = edges.map((edge) => {
    if (edge.target === tickEntryId && edge.targetHandle === 'exec-in') {
      return {
        ...edge,
        target: infinityId,
        targetHandle: LOOP_REPEAT_EXEC_IN,
      };
    }
    return edge;
  });

  return { nodes: nextNodes, edges: nextEdges };
}

/** Синхронизирует пины loop-repeat (идемпотентно). */
export function syncLoopRepeatNodePins(nodes: readonly Node[]): Node[] {
  return nodes.map((node) => {
    if (!isLoopRepeatNode(node)) {
      return node;
    }
    return {
      ...node,
      data: {
        ...(node.data as BoardFlowNodeData),
        inputs: [EXEC_IN],
        outputs: [],
      },
    };
  });
}
