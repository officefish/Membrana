import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** FlushSpectralAnalyser — явный flush очереди FFT (без Collect event). */
export const FLUSH_SPECTRAL_ANALYSER_NODE_KIND = 'flush-spectral-analyser' as const;

export const FLUSH_SPECTRAL_ANALYSER_HANDLE = 'analyser' as const;
export const FLUSH_SPECTRAL_FRAMES_HANDLE = 'frames' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины FlushSpectralAnalyser. */
export function flushSpectralAnalyserNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: FLUSH_SPECTRAL_ANALYSER_HANDLE,
        kind: 'data',
        socketType: 'SpectralAnalyserRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: FLUSH_SPECTRAL_FRAMES_HANDLE,
        kind: 'data',
        socketType: 'FftFrameRefList',
      },
    ],
  };
}

export interface CreateFlushSpectralAnalyserBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let flushSpectralSeq = 0;

/** Фабрика узла FlushSpectralAnalyser. */
export function createFlushSpectralAnalyserBoardNode(
  options: CreateFlushSpectralAnalyserBoardNodeOptions = {},
): Node {
  flushSpectralSeq += 1;
  const id =
    options.id ??
    `node-flush-spectral-analyser-${Date.now().toString(36)}-${flushSpectralSeq}`;
  const { inputs, outputs } = flushSpectralAnalyserNodePins();
  const data: BoardFlowNodeData = {
    label: 'FlushSpectralAnalyser',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: FLUSH_SPECTRAL_ANALYSER_NODE_KIND,
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

/** True, если узел — FlushSpectralAnalyser. */
export function isFlushSpectralAnalyserNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    node.data.nodeKind === FLUSH_SPECTRAL_ANALYSER_NODE_KIND
  );
}
