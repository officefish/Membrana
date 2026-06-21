import {
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  type ScenarioCollectorConfig,
} from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import {
  COLLECT_BATCH_OUT_HANDLE,
  COLLECT_EVENT_OUT_HANDLE,
} from './collect-node-shared.js';

export const COLLECT_FFT_FRAMES_NODE_KIND = 'collect-fft-frames' as const;

/** Data-вход SpectralAnalyserRef singleton. */
export const COLLECT_FFT_ANALYSER_HANDLE = 'analyser' as const;

/** Data-вход FftFrameRef за exec-тик. */
export const COLLECT_FFT_FRAME_HANDLE = 'frame' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины CollectFftFrames: exec + analyser + frame in; exec + event + batches out. */
export function collectFftFramesNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: COLLECT_FFT_ANALYSER_HANDLE,
        kind: 'data',
        socketType: 'SpectralAnalyserRef',
      },
      {
        name: COLLECT_FFT_FRAME_HANDLE,
        kind: 'data',
        socketType: 'FftFrameRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      { name: COLLECT_EVENT_OUT_HANDLE, kind: 'event' },
      {
        name: COLLECT_BATCH_OUT_HANDLE,
        kind: 'data',
        socketType: 'FftFrameRefList',
      },
    ],
  };
}

export interface CreateCollectFftFramesBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly collectorConfig?: Partial<ScenarioCollectorConfig>;
}

let collectFftSeq = 0;

/** Фабрика узла CollectFftFrames. */
export function createCollectFftFramesBoardNode(
  options: CreateCollectFftFramesBoardNodeOptions = {},
): Node {
  collectFftSeq += 1;
  const id =
    options.id ?? `node-collect-fft-frames-${Date.now().toString(36)}-${collectFftSeq}`;
  const { inputs, outputs } = collectFftFramesNodePins();
  const data: BoardFlowNodeData = {
    label: 'CollectFftFrames',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: COLLECT_FFT_FRAMES_NODE_KIND,
    inputs,
    outputs,
    collectorConfig: {
      ...DEFAULT_SCENARIO_COLLECTOR_CONFIG,
      ...options.collectorConfig,
    },
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — CollectFftFrames. */
export function isCollectFftFramesNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === COLLECT_FFT_FRAMES_NODE_KIND
  );
}
