import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * GetSpectralAnalyser — метод устройства: singleton SpectralAnalyserRef для DeviceRef.
 * Host-сессия регистрируется в DBC2; на графе — exec + device in, analyser out.
 */
export const GET_SPECTRAL_ANALYSER_NODE_KIND = 'get-spectral-analyser' as const;

/** Data-вход DeviceRef. */
export const GET_SPECTRAL_ANALYSER_DEVICE_HANDLE = 'device' as const;

/** Data-выход SpectralAnalyserRef. */
export const GET_SPECTRAL_ANALYSER_OUT_HANDLE = 'analyser' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины GetSpectralAnalyser: exec + device in, exec + analyser out. */
export function getSpectralAnalyserNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
        kind: 'data',
        socketType: 'DeviceRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: GET_SPECTRAL_ANALYSER_OUT_HANDLE,
        kind: 'data',
        socketType: 'SpectralAnalyserRef',
      },
    ],
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
