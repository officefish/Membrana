import { describe, expect, it } from 'vitest';

import {
  DETECTION_FUSION_MAX_INPUTS,
  DETECTION_FUSION_MIN_INPUTS,
  MAKE_DETECTION_FUSION_NODE_KIND,
  MAKE_DETECTION_FUSION_OUT_HANDLE,
  clampDetectionFusionInputCount,
  createMakeDetectionFusionBoardNode,
  detectionFusionAnalysisHandle,
  isMakeDetectionFusionNode,
  isMakeDetectionFusionNodeKind,
  makeDetectionFusionNodePins,
} from './make-detection-fusion-node.js';
import { isBoardFlowNodeData } from './board-node-data.js';

describe('make-detection-fusion node (basn-2)', () => {
  it('clampDetectionFusionInputCount: клампит в [2..4], NaN/undefined → 2', () => {
    expect(clampDetectionFusionInputCount(undefined)).toBe(DETECTION_FUSION_MIN_INPUTS);
    expect(clampDetectionFusionInputCount(Number.NaN)).toBe(DETECTION_FUSION_MIN_INPUTS);
    expect(clampDetectionFusionInputCount(1)).toBe(2);
    expect(clampDetectionFusionInputCount(3)).toBe(3);
    expect(clampDetectionFusionInputCount(99)).toBe(DETECTION_FUSION_MAX_INPUTS);
  });

  it('пины по умолчанию: exec + 2 входа DetectionAnalysisRef → value DetectionFusion', () => {
    const { inputs, outputs } = makeDetectionFusionNodePins();
    const dataInputs = inputs.filter((p) => p.kind === 'data');
    expect(dataInputs).toHaveLength(2);
    expect(dataInputs.map((p) => p.name)).toEqual(['analysis-1', 'analysis-2']);
    expect(dataInputs.every((p) => p.socketType === 'DetectionAnalysisRef')).toBe(true);
    const dataOut = outputs.find((p) => p.name === MAKE_DETECTION_FUSION_OUT_HANDLE);
    expect(dataOut?.socketType).toBe('DetectionFusion');
  });

  it('вариадика: 4 входа, сверх минимума — nullable (молчащий не ломает)', () => {
    const { inputs } = makeDetectionFusionNodePins(4);
    const dataInputs = inputs.filter((p) => p.kind === 'data');
    expect(dataInputs).toHaveLength(4);
    expect(dataInputs[0]?.nullable).toBeUndefined();
    expect(dataInputs[1]?.nullable).toBeUndefined();
    expect(dataInputs[2]?.nullable).toBe(true);
    expect(dataInputs[3]?.nullable).toBe(true);
  });

  it('фабрика: nodeKind, число входов на data, guard-ы узнают узел', () => {
    const node = createMakeDetectionFusionBoardNode({ inputCount: 3 });
    expect(isMakeDetectionFusionNode(node)).toBe(true);
    expect(isMakeDetectionFusionNodeKind(MAKE_DETECTION_FUSION_NODE_KIND)).toBe(true);
    expect(isMakeDetectionFusionNodeKind('make-track')).toBe(false);
    expect(isBoardFlowNodeData(node.data)).toBe(true);
    if (isBoardFlowNodeData(node.data)) {
      expect(node.data.nodeKind).toBe('make-detection-fusion');
      expect(node.data.detectionFusionInputCount).toBe(3);
    }
  });

  it('detectionFusionAnalysisHandle: analysis-1..analysis-4', () => {
    expect(detectionFusionAnalysisHandle(1)).toBe('analysis-1');
    expect(detectionFusionAnalysisHandle(4)).toBe('analysis-4');
  });
});
