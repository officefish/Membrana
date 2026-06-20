import {
  createReferenceValue,
  formatFftTrendAnalysisRefHandle,
  type ScenarioReferenceValue,
} from '@membrana/core';

/** In-memory FftTrendAnalysisRef registry per NewFftTrendsAnalysis node execution. */
export class FftTrendAnalysisRuntimeStore {
  private readonly nodeAnalyses = new Map<string, ScenarioReferenceValue>();

  /** Сохраняет FftTrendAnalysisRef для узла NewFftTrendsAnalysis. */
  setNodeAnalysis(nodeId: string, analysisId: string): ScenarioReferenceValue {
    const ref = createReferenceValue('FftTrendAnalysisRef', formatFftTrendAnalysisRefHandle(analysisId));
    this.nodeAnalyses.set(nodeId, ref);
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

  resetAll(): void {
    this.nodeAnalyses.clear();
  }
}
