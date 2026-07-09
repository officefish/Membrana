import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * basn-4 (#323, консилиум 2026-07-09 т.2): узел MakeProximityTrend — «дистанция»
 * alarm-loop. Чистый классификатор classifyProximityTrend живёт в core;
 * stateful-накопление серий (громкость, combinedScore) — на ХОСТЕ per nodeId.
 * Узел stateless. Выход ProximityRef: **invalid при trend='lost'** — выход из
 * alarm-loop собирается существующим is-valid (false-ветка), без нового
 * branch-узла (т.5: строго композиция).
 */

export const MAKE_PROXIMITY_TREND_NODE_KIND = 'make-proximity-trend' as const;

/** Data-вход value DetectionFusion (score-гейт для детекции 'lost'). */
export const MAKE_PROXIMITY_TREND_FUSION_HANDLE = 'fusion' as const;

/** Data-выход ProximityRef (valid=false при 'lost'). */
export const MAKE_PROXIMITY_TREND_OUT_HANDLE = 'proximity' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины MakeProximityTrend: exec + fusion in → ProximityRef out. */
export function makeProximityTrendNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: MAKE_PROXIMITY_TREND_FUSION_HANDLE,
        kind: 'data',
        socketType: 'DetectionFusion',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_PROXIMITY_TREND_OUT_HANDLE,
        kind: 'data',
        socketType: 'ProximityRef',
      },
    ],
  };
}

export interface CreateMakeProximityTrendBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let makeProximityTrendSeq = 0;

/** Узел MakeProximityTrend — тренд «дистанции» (host-store) → ProximityRef. */
export function createMakeProximityTrendBoardNode(
  options: CreateMakeProximityTrendBoardNodeOptions = {},
): Node {
  makeProximityTrendSeq += 1;
  const id =
    options.id ?? `node-make-proximity-trend-${Date.now().toString(36)}-${makeProximityTrendSeq}`;
  const { inputs, outputs } = makeProximityTrendNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeProximityTrend',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_PROXIMITY_TREND_NODE_KIND,
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

/** True, если узел — MakeProximityTrend. */
export function isMakeProximityTrendNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === MAKE_PROXIMITY_TREND_NODE_KIND
  );
}

/** True, если nodeKind — MakeProximityTrend. */
export function isMakeProximityTrendNodeKind(
  kind: string | undefined,
): kind is typeof MAKE_PROXIMITY_TREND_NODE_KIND {
  return kind === MAKE_PROXIMITY_TREND_NODE_KIND;
}
