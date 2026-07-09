import {
  createReferenceValue,
  formatFftTrendAnalysisRefHandle,
  type ScenarioReferenceValue,
} from '@membrana/core';

import type { ScenarioDetectionResult } from './types.js';

/** In-memory FftTrendAnalysisRef registry per NewFftTrendsAnalysis node execution. */
export class FftTrendAnalysisRuntimeStore {
  private readonly nodeAnalyses = new Map<string, ScenarioReferenceValue>();
  /** basn-2: детекция по handle анализа — вход MakeDetectionFusion. */
  private readonly handleDetections = new Map<string, ScenarioDetectionResult>();

  /** Сохраняет FftTrendAnalysisRef для узла NewFftTrendsAnalysis (+ детекцию для fusion). */
  setNodeAnalysis(
    nodeId: string,
    analysisId: string,
    detection?: ScenarioDetectionResult | null,
  ): ScenarioReferenceValue {
    const ref = createReferenceValue('FftTrendAnalysisRef', formatFftTrendAnalysisRefHandle(analysisId));
    this.nodeAnalyses.set(nodeId, ref);
    if (detection !== undefined && detection !== null && ref.handle !== null) {
      this.handleDetections.set(ref.handle, detection);
    }
    return ref;
  }

  /** FftTrendAnalysisRef последнего выполнения узла NewFftTrendsAnalysis. */
  getAnalysisRef(nodeId: string): ScenarioReferenceValue {
    return (
      this.nodeAnalyses.get(nodeId) ?? {
        kind: 'FftTrendAnalysisRef',
        handle: null,
        valid: false,
      }
    );
  }

  /** basn-2: детекция анализа по handle (для MakeDetectionFusion); null — не считалась. */
  getDetectionByHandle(handle: string): ScenarioDetectionResult | null {
    return this.handleDetections.get(handle) ?? null;
  }

  resetAll(): void {
    this.nodeAnalyses.clear();
    this.handleDetections.clear();
  }
}
