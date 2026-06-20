import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

export const NEW_FFT_TRENDS_ANALYSIS_NODE_KIND = 'new-fft-trends-analysis' as const;

/** Data-вход batch FftFrameRef[] от CollectFftFrames. */
export const NEW_FFT_TRENDS_FRAMES_HANDLE = 'frames' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };

/** Пины NewFftTrendsAnalysis: exec-in + frames in; terminal — без выходов. */
export function newFftTrendsAnalysisNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: NEW_FFT_TRENDS_FRAMES_HANDLE,
        kind: 'data',
        socketType: 'FftFrameRefList',
      },
    ],
    outputs: [],
  };
}

export interface CreateNewFftTrendsAnalysisBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let newFftTrendsSeq = 0;

/** Фабрика terminal-узла NewFftTrendsAnalysis. */
export function createNewFftTrendsAnalysisBoardNode(
  options: CreateNewFftTrendsAnalysisBoardNodeOptions = {},
): Node {
  newFftTrendsSeq += 1;
  const id =
    options.id ?? `node-new-fft-trends-${Date.now().toString(36)}-${newFftTrendsSeq}`;
  const { inputs, outputs } = newFftTrendsAnalysisNodePins();
  const data: BoardFlowNodeData = {
    label: 'NewFftTrendsAnalysis',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: NEW_FFT_TRENDS_ANALYSIS_NODE_KIND,
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

/** True, если узел — NewFftTrendsAnalysis. */
export function isNewFftTrendsAnalysisNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    node.data.nodeKind === NEW_FFT_TRENDS_ANALYSIS_NODE_KIND
  );
}
