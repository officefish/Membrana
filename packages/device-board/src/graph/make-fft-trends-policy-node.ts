import { DEFAULT_FFT_TRENDS_POLICY, type ScenarioFftTrendsPolicy } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** MakeFftTrendsPolicy — value constructor: конфиг на узле → FftTrendsPolicy data-out. */
export const MAKE_FFT_TRENDS_POLICY_NODE_KIND = 'make-fft-trends-policy' as const;

export const MAKE_FFT_TRENDS_POLICY_OUT_HANDLE = 'policy' as const;

/** Пины MakeFftTrendsPolicy (always pure — без exec). */
export function makeFftTrendsPolicyNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [],
    outputs: [
      {
        name: MAKE_FFT_TRENDS_POLICY_OUT_HANDLE,
        kind: 'data',
        socketType: 'FftTrendsPolicy',
      },
    ],
  };
}

export interface CreateMakeFftTrendsPolicyBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly fftTrendsPolicy?: Partial<ScenarioFftTrendsPolicy>;
}

let makeFftTrendsPolicySeq = 0;

/** Фабрика узла MakeFftTrendsPolicy. */
export function createMakeFftTrendsPolicyBoardNode(
  options: CreateMakeFftTrendsPolicyBoardNodeOptions = {},
): Node {
  makeFftTrendsPolicySeq += 1;
  const id =
    options.id ??
    `node-make-fft-trends-policy-${Date.now().toString(36)}-${makeFftTrendsPolicySeq}`;
  const { inputs, outputs } = makeFftTrendsPolicyNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeFftTrendsPolicy',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_FFT_TRENDS_POLICY_NODE_KIND,
    inputs,
    outputs,
    fftTrendsPolicy: {
      ...DEFAULT_FFT_TRENDS_POLICY,
      ...options.fftTrendsPolicy,
    },
    pure: true,
  };
  return { id, type: 'board', position: options.position ?? { x: 0, y: 0 }, data };
}

/** Type guard nodeKind make-fft-trends-policy. */
export function isMakeFftTrendsPolicyNodeKind(
  nodeKind: string | undefined,
): nodeKind is typeof MAKE_FFT_TRENDS_POLICY_NODE_KIND {
  return nodeKind === MAKE_FFT_TRENDS_POLICY_NODE_KIND;
}

/** Читает fftTrendsPolicy из data ноды или ScenarioGraphNode (serialize). */
export function readMakeFftTrendsPolicyFromNodeData(
  data: Record<string, unknown>,
): Partial<ScenarioFftTrendsPolicy> | undefined {
  if (isBoardFlowNodeData(data)) {
    return data.fftTrendsPolicy;
  }
  const direct = data.fftTrendsPolicy;
  if (direct !== undefined && typeof direct === 'object') {
    return direct as Partial<ScenarioFftTrendsPolicy>;
  }
  return undefined;
}
