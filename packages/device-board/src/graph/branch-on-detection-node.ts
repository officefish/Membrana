import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * basn-3 (#323, консилиум 2026-07-09): узел BranchOnDetection — exec-ветвление
 * detected / not-detected по `combinedScore >= threshold` (порог на узле).
 * Чистый (host не нужен). Имя БЕЗ make-* — ветвление, не конструктор (т.6).
 * Invalid/пустой вход → not-detected, не throw: alarm-цепочка не рушится от
 * молчащего fusion. NB: одноимённый `branch-on-detection` в ScenarioBlockKind —
 * legacy D0-блок; наш узел живёт в nodeKind при blockKind:'custom', диспатч раздельный.
 */

export const BRANCH_ON_DETECTION_NODE_KIND = 'branch-on-detection' as const;

/** Data-вход value DetectionFusion (от MakeDetectionFusion). */
export const BRANCH_ON_DETECTION_FUSION_HANDLE = 'fusion' as const;

/** Exec-выход: детекция подтверждена (combinedScore >= threshold). */
export const BRANCH_ON_DETECTION_DETECTED_HANDLE = 'detected' as const;

/** Exec-выход: детекции нет (score ниже порога / вход молчит). */
export const BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE = 'not-detected' as const;

/** Дефолтный порог combinedScore. */
export const DEFAULT_DETECTION_THRESHOLD = 0.5;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };

/** Кламп порога в [0..1]; NaN/undefined → дефолт. */
export function clampDetectionThreshold(threshold: number | undefined): number {
  if (threshold === undefined || !Number.isFinite(threshold)) {
    return DEFAULT_DETECTION_THRESHOLD;
  }
  if (threshold < 0) return 0;
  if (threshold > 1) return 1;
  return threshold;
}

/** Пины BranchOnDetection: exec + fusion in → exec detected / not-detected. */
export function branchOnDetectionNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: BRANCH_ON_DETECTION_FUSION_HANDLE,
        kind: 'data',
        socketType: 'DetectionFusion',
      },
    ],
    outputs: [
      { name: BRANCH_ON_DETECTION_DETECTED_HANDLE, kind: 'exec' },
      { name: BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE, kind: 'exec' },
    ],
  };
}

export interface CreateBranchOnDetectionBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  /** Порог combinedScore (клампится в 0..1; default 0.5). */
  readonly threshold?: number;
}

let branchOnDetectionSeq = 0;

/** Узел BranchOnDetection — exec-ветвление по combinedScore >= threshold. */
export function createBranchOnDetectionBoardNode(
  options: CreateBranchOnDetectionBoardNodeOptions = {},
): Node {
  branchOnDetectionSeq += 1;
  const id =
    options.id ?? `node-branch-on-detection-${Date.now().toString(36)}-${branchOnDetectionSeq}`;
  const { inputs, outputs } = branchOnDetectionNodePins();
  const data: BoardFlowNodeData = {
    label: 'BranchOnDetection',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: BRANCH_ON_DETECTION_NODE_KIND,
    inputs,
    outputs,
    detectionThreshold: clampDetectionThreshold(options.threshold),
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — BranchOnDetection (v0.4 nodeKind, не legacy D0 blockKind). */
export function isBranchOnDetectionNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === BRANCH_ON_DETECTION_NODE_KIND
  );
}

/** True, если nodeKind — BranchOnDetection. */
export function isBranchOnDetectionNodeKind(
  kind: string | undefined,
): kind is typeof BRANCH_ON_DETECTION_NODE_KIND {
  return kind === BRANCH_ON_DETECTION_NODE_KIND;
}
