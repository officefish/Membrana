import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * IsWindowElapsed (PC-2, консилиум pc2-periodic-window-gate 2026-07-15) —
 * периодический гейт окна по host-часам, БЕЗ RecorderRef. Владелец времени
 * наблюдательного лупа: альтернатива рекордеру-как-часам (спектральный сценарий
 * больше не тащит get-recorder ради «прошло N мс»).
 *
 * Природа — polling-гейт в лупе (true/false по факту), НЕ event-таймер. Граница с
 * тиком (вердикт консилиума): onTick/waitUntilNextLoopTick = pacing лупа (как часто
 * крутится); is-window-elapsed = ГЕЙТ-потребитель (накопилось ли окно). Не дубль тика.
 *
 * Окно периодическое, самосбрасывающееся: гейт держит per-node точку отсчёта на
 * хосте; при срабатывании (elapsed >= windowMs) → true + сброс окна.
 */
export const IS_WINDOW_ELAPSED_NODE_KIND = 'is-window-elapsed' as const;

/** Data-вход windowMs (Integer, nullable — иначе node.windowElapsedMs / дефолт). */
export const IS_WINDOW_ELAPSED_WINDOW_MS_HANDLE = 'windowMs' as const;
/** Совпадает с is-valid exec-true-out (connection-suggest). */
export const IS_WINDOW_ELAPSED_TRUE_HANDLE = 'exec-true-out' as const;
/** Совпадает с is-valid exec-false-out. */
export const IS_WINDOW_ELAPSED_FALSE_HANDLE = 'exec-false-out' as const;

/** Дефолт окна, если не задано ни проводом, ни полем узла. */
export const DEFAULT_WINDOW_ELAPSED_MS = 5000 as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };

/** Пины IsWindowElapsed (ветки как у is-valid; БЕЗ RecorderRef). */
export function isWindowElapsedNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: IS_WINDOW_ELAPSED_WINDOW_MS_HANDLE,
        kind: 'data',
        socketType: 'Integer',
        nullable: true,
      },
    ],
    outputs: [
      { name: IS_WINDOW_ELAPSED_TRUE_HANDLE, kind: 'exec' },
      { name: IS_WINDOW_ELAPSED_FALSE_HANDLE, kind: 'exec' },
    ],
  };
}

export interface CreateIsWindowElapsedBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly windowElapsedMs?: number;
}

let isWindowElapsedSeq = 0;

/** Фабрика узла IsWindowElapsed. */
export function createIsWindowElapsedBoardNode(
  options: CreateIsWindowElapsedBoardNodeOptions = {},
): Node {
  isWindowElapsedSeq += 1;
  const id =
    options.id ?? `node-is-window-elapsed-${Date.now().toString(36)}-${isWindowElapsedSeq}`;
  const { inputs, outputs } = isWindowElapsedNodePins();
  const data: BoardFlowNodeData = {
    label: 'IsWindowElapsed',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: IS_WINDOW_ELAPSED_NODE_KIND,
    inputs,
    outputs,
    windowElapsedMs: options.windowElapsedMs ?? DEFAULT_WINDOW_ELAPSED_MS,
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — IsWindowElapsed. */
export function isIsWindowElapsedNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === IS_WINDOW_ELAPSED_NODE_KIND
  );
}
