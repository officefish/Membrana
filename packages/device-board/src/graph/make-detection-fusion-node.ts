import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * basn-2 (#323, консилиум 2026-07-09): узел MakeDetectionFusion — слияние 2–4
 * детекционных анализов во value `DetectionFusion` (combinedScore, agreement).
 * Слияние считает ядро `fuseDetectorConfidences` (@membrana/core); узел чистый,
 * host не нужен. Выход — value (т.1 консилиума: ref только у сущностей со
 * временем жизни). Входы — вариадический список min 2 / max 4 (т.3: потолок —
 * граница калибровки), обобщённый тип `DetectionAnalysisRef` принимает
 * FftTrendAnalysisRef | EnsembleAnalysisRef (isValidSocketConnection).
 */

export const MAKE_DETECTION_FUSION_NODE_KIND = 'make-detection-fusion' as const;

/** Минимум входов fusion (консилиум т.3). */
export const DETECTION_FUSION_MIN_INPUTS = 2;

/** Максимум входов fusion — граница калибровки (консилиум т.3). */
export const DETECTION_FUSION_MAX_INPUTS = 4;

/** Префикс data-входов анализов: analysis-1 … analysis-4. */
export const MAKE_DETECTION_FUSION_ANALYSIS_HANDLE_PREFIX = 'analysis-' as const;

/** Data-выход value DetectionFusion. */
export const MAKE_DETECTION_FUSION_OUT_HANDLE = 'fusion' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Кламп числа входов в [min..max]; NaN/не-целое → min. */
export function clampDetectionFusionInputCount(count: number | undefined): number {
  if (count === undefined || !Number.isFinite(count)) return DETECTION_FUSION_MIN_INPUTS;
  const n = Math.trunc(count);
  if (n < DETECTION_FUSION_MIN_INPUTS) return DETECTION_FUSION_MIN_INPUTS;
  if (n > DETECTION_FUSION_MAX_INPUTS) return DETECTION_FUSION_MAX_INPUTS;
  return n;
}

/** Handle входа анализа по индексу (1-based): analysis-1 … analysis-4. */
export function detectionFusionAnalysisHandle(index: number): string {
  return `${MAKE_DETECTION_FUSION_ANALYSIS_HANDLE_PREFIX}${index}`;
}

/** Пины MakeDetectionFusion: exec + N входов DetectionAnalysisRef → value DetectionFusion. */
export function makeDetectionFusionNodePins(inputCount?: number): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  const count = clampDetectionFusionInputCount(inputCount);
  const analysisPins: BoardSocketPin[] = [];
  for (let i = 1; i <= count; i += 1) {
    analysisPins.push({
      name: detectionFusionAnalysisHandle(i),
      kind: 'data',
      socketType: 'DetectionAnalysisRef',
      // Сверх минимума — опциональные: молчащий вход не ломает узел (present:false).
      ...(i > DETECTION_FUSION_MIN_INPUTS ? { nullable: true } : {}),
    });
  }
  return {
    inputs: [EXEC_IN, ...analysisPins],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_DETECTION_FUSION_OUT_HANDLE,
        kind: 'data',
        socketType: 'DetectionFusion',
      },
    ],
  };
}

export interface CreateMakeDetectionFusionBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  /** Число входов анализов (клампится в 2..4; default 2). */
  readonly inputCount?: number;
}

let makeDetectionFusionSeq = 0;

/** Узел MakeDetectionFusion — 2–4 анализа → value DetectionFusion (combinedScore). */
export function createMakeDetectionFusionBoardNode(
  options: CreateMakeDetectionFusionBoardNodeOptions = {},
): Node {
  makeDetectionFusionSeq += 1;
  const id =
    options.id ?? `node-make-detection-fusion-${Date.now().toString(36)}-${makeDetectionFusionSeq}`;
  const inputCount = clampDetectionFusionInputCount(options.inputCount);
  const { inputs, outputs } = makeDetectionFusionNodePins(inputCount);
  const data: BoardFlowNodeData = {
    label: 'MakeDetectionFusion',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_DETECTION_FUSION_NODE_KIND,
    inputs,
    outputs,
    detectionFusionInputCount: inputCount,
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — MakeDetectionFusion. */
export function isMakeDetectionFusionNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === MAKE_DETECTION_FUSION_NODE_KIND
  );
}

/** True, если nodeKind — MakeDetectionFusion. */
export function isMakeDetectionFusionNodeKind(
  kind: string | undefined,
): kind is typeof MAKE_DETECTION_FUSION_NODE_KIND {
  return kind === MAKE_DETECTION_FUSION_NODE_KIND;
}
