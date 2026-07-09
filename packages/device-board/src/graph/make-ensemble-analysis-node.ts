import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * basn-1 (#323, консилиум 2026-07-09): узел MakeEnsembleAnalysis — второй детектор.
 * DSP-ансамбль (harmonic/cepstral/spectral-flux) гоняется ХОСТОМ (host-мост
 * makeEnsembleAnalysisFromSampleRefs → EnsembleProducer из detection-ensemble-service
 * на стороне клиента); узел stateless, device-board сервисы не импортирует.
 * Data-in: AudioSampleRefList (окно от CollectSamples). Data-out: EnsembleAnalysisRef
 * (ref — у анализа есть идентичность/время жизни на хосте, т.1 консилиума).
 */

export const MAKE_ENSEMBLE_ANALYSIS_NODE_KIND = 'make-ensemble-analysis' as const;

/** Data-вход batch AudioSampleRef[] от CollectSamples. */
export const MAKE_ENSEMBLE_ANALYSIS_SAMPLES_HANDLE = 'samples' as const;

/** Data-выход EnsembleAnalysisRef. */
export const MAKE_ENSEMBLE_ANALYSIS_OUT_HANDLE = 'analysis' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины MakeEnsembleAnalysis: exec + samples in → analysis out. */
export function makeEnsembleAnalysisNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: MAKE_ENSEMBLE_ANALYSIS_SAMPLES_HANDLE,
        kind: 'data',
        socketType: 'AudioSampleRefList',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_ENSEMBLE_ANALYSIS_OUT_HANDLE,
        kind: 'data',
        socketType: 'EnsembleAnalysisRef',
      },
    ],
  };
}

export interface CreateMakeEnsembleAnalysisBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let makeEnsembleAnalysisSeq = 0;

/** Узел MakeEnsembleAnalysis — DSP-ансамбль на окне (host) → EnsembleAnalysisRef. */
export function createMakeEnsembleAnalysisBoardNode(
  options: CreateMakeEnsembleAnalysisBoardNodeOptions = {},
): Node {
  makeEnsembleAnalysisSeq += 1;
  const id =
    options.id ?? `node-make-ensemble-analysis-${Date.now().toString(36)}-${makeEnsembleAnalysisSeq}`;
  const { inputs, outputs } = makeEnsembleAnalysisNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeEnsembleAnalysis',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_ENSEMBLE_ANALYSIS_NODE_KIND,
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

/** True, если узел — MakeEnsembleAnalysis. */
export function isMakeEnsembleAnalysisNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === MAKE_ENSEMBLE_ANALYSIS_NODE_KIND
  );
}

/** True, если nodeKind — MakeEnsembleAnalysis. */
export function isMakeEnsembleAnalysisNodeKind(
  kind: string | undefined,
): kind is typeof MAKE_ENSEMBLE_ANALYSIS_NODE_KIND {
  return kind === MAKE_ENSEMBLE_ANALYSIS_NODE_KIND;
}
