import { DEFAULT_FFT_TRENDS_POLICY, type ScenarioFftTrendsPolicy } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

export const MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND = 'make-fft-trends-analysis' as const;

/** @deprecated Сериализованные сценарии v0.5; runtime принимает для миграции. */
export const LEGACY_MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND = 'new-fft-trends-analysis' as const;

/** Data-вход SpectralAnalyserRef (метод singleton-сессии). */
export const MAKE_FFT_TRENDS_ANALYSER_HANDLE = 'analyser' as const;

/** Data-вход batch FftFrameRef[] от CollectFftFrames. */
export const MAKE_FFT_TRENDS_FRAMES_HANDLE = 'frames' as const;

/** Data-вход FftTrendsPolicy (MakeFftTrendsPolicy или fallback на узле). */
export const MAKE_FFT_TRENDS_POLICY_HANDLE = 'policy' as const;

/** Data-выход FftTrendAnalysisRef. */
export const MAKE_FFT_TRENDS_ANALYSIS_OUT_HANDLE = 'analysis' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины MakeFftTrendsAnalysis: exec + analyser + fft batch in → analysis out. */
export function makeFftTrendsAnalysisNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: MAKE_FFT_TRENDS_ANALYSER_HANDLE,
        kind: 'data',
        socketType: 'SpectralAnalyserRef',
      },
      {
        name: MAKE_FFT_TRENDS_FRAMES_HANDLE,
        kind: 'data',
        socketType: 'FftFrameRefList',
      },
      {
        name: MAKE_FFT_TRENDS_POLICY_HANDLE,
        kind: 'data',
        socketType: 'FftTrendsPolicy',
        nullable: true,
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_FFT_TRENDS_ANALYSIS_OUT_HANDLE,
        kind: 'data',
        socketType: 'FftTrendAnalysisRef',
      },
    ],
  };
}

export interface CreateMakeFftTrendsAnalysisBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly fftTrendsPolicy?: Partial<ScenarioFftTrendsPolicy>;
}

let makeFftTrendsSeq = 0;

/** Узел MakeFftTrendsAnalysis — метод SpectralAnalyserRef: batch FFT → FftTrendAnalysisRef. */
export function createMakeFftTrendsAnalysisBoardNode(
  options: CreateMakeFftTrendsAnalysisBoardNodeOptions = {},
): Node {
  makeFftTrendsSeq += 1;
  const id =
    options.id ?? `node-make-fft-trends-${Date.now().toString(36)}-${makeFftTrendsSeq}`;
  const { inputs, outputs } = makeFftTrendsAnalysisNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeFftTrendsAnalysis',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND,
    inputs,
    outputs,
    fftTrendsPolicy: {
      ...DEFAULT_FFT_TRENDS_POLICY,
      ...options.fftTrendsPolicy,
    },
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — MakeFftTrendsAnalysis (включая legacy). */
export function isMakeFftTrendsAnalysisNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    (node.data.nodeKind === MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND ||
      (node.data.nodeKind as string) === LEGACY_MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND)
  );
}

/** True, если nodeKind — MakeFftTrendsAnalysis (включая legacy). */
export function isMakeFftTrendsAnalysisNodeKind(
  kind: string | undefined,
): kind is
  | typeof MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND
  | typeof LEGACY_MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND {
  return (
    kind === MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND ||
    kind === LEGACY_MAKE_FFT_TRENDS_ANALYSIS_NODE_KIND
  );
}
