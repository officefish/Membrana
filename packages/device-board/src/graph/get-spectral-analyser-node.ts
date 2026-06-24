import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * GetSpectralAnalyser — метод устройства: singleton SpectralAnalyserRef для DeviceRef.
 * Ref-provider getter: default pure (data-only); impure — exec passthrough.
 */
export const GET_SPECTRAL_ANALYSER_NODE_KIND = 'get-spectral-analyser' as const;

/** Data-вход DeviceRef. */
export const GET_SPECTRAL_ANALYSER_DEVICE_HANDLE = 'device' as const;

/** Data-выход SpectralAnalyserRef. */
export const GET_SPECTRAL_ANALYSER_OUT_HANDLE = 'analyser' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины GetSpectralAnalyser: pure (default) — device in, analyser out; impure — + exec. */
export function getSpectralAnalyserNodePins(pure = true): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  const deviceIn: BoardSocketPin = {
    name: GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
    kind: 'data',
    socketType: 'DeviceRef',
  };
  const analyserOut: BoardSocketPin = {
    name: GET_SPECTRAL_ANALYSER_OUT_HANDLE,
    kind: 'data',
    socketType: 'SpectralAnalyserRef',
  };
  if (pure) {
    return { inputs: [deviceIn], outputs: [analyserOut] };
  }
  return {
    inputs: [EXEC_IN, deviceIn],
    outputs: [EXEC_OUT, analyserOut],
  };
}

export interface CreateGetSpectralAnalyserBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let getSpectralAnalyserSeq = 0;

/** Фабрика узла GetSpectralAnalyser. */
export function createGetSpectralAnalyserBoardNode(
  options: CreateGetSpectralAnalyserBoardNodeOptions = {},
): Node {
  getSpectralAnalyserSeq += 1;
  const id =
    options.id ??
    `node-get-spectral-analyser-${Date.now().toString(36)}-${getSpectralAnalyserSeq}`;
  const { inputs, outputs } = getSpectralAnalyserNodePins();
  const data: BoardFlowNodeData = {
    label: 'GetSpectralAnalyser',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: GET_SPECTRAL_ANALYSER_NODE_KIND,
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

/** True, если узел — GetSpectralAnalyser. */
export function isGetSpectralAnalyserNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    node.data.nodeKind === GET_SPECTRAL_ANALYSER_NODE_KIND
  );
}
