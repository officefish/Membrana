import {
  createReferenceValue,
  formatEnsembleAnalysisRefHandle,
  type ScenarioReferenceValue,
} from '@membrana/core';

import type { ScenarioDetectionResult } from './types.js';

/**
 * basn-1 (#323): in-memory EnsembleAnalysisRef registry per MakeEnsembleAnalysis
 * node execution. Зеркало FftTrendAnalysisRuntimeStore: ref по nodeId + детекция
 * по handle (вход MakeDetectionFusion).
 */
export class EnsembleAnalysisRuntimeStore {
  private readonly nodeAnalyses = new Map<string, ScenarioReferenceValue>();
  private readonly handleDetections = new Map<string, ScenarioDetectionResult>();

  /** Сохраняет EnsembleAnalysisRef для узла (+ детекцию для fusion). */
  setNodeAnalysis(
    nodeId: string,
    analysisId: string,
    detection?: ScenarioDetectionResult | null,
  ): ScenarioReferenceValue {
    const ref = createReferenceValue(
      'EnsembleAnalysisRef',
      formatEnsembleAnalysisRefHandle(analysisId),
    );
    this.nodeAnalyses.set(nodeId, ref);
    if (detection !== undefined && detection !== null && ref.handle !== null) {
      this.handleDetections.set(ref.handle, detection);
    }
    return ref;
  }

  /** EnsembleAnalysisRef последнего выполнения узла. */
  getAnalysisRef(nodeId: string): ScenarioReferenceValue {
    return (
      this.nodeAnalyses.get(nodeId) ?? {
        kind: 'EnsembleAnalysisRef',
        handle: null,
        valid: false,
      }
    );
  }

  /** Детекция ансамбля по handle (для MakeDetectionFusion); null — не считалась. */
  getDetectionByHandle(handle: string): ScenarioDetectionResult | null {
    return this.handleDetections.get(handle) ?? null;
  }

  resetAll(): void {
    this.nodeAnalyses.clear();
    this.handleDetections.clear();
  }
}
