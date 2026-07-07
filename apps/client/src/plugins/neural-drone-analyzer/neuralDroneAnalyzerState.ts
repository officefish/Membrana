/**
 * ND2 — состояние плагина нейро-детекции (паттерн trendsFftSamplePluginState:
 * иммутабельный snapshot + subscribe для useSyncExternalStore).
 */
import type { DetectionResult } from '@membrana/detector-base';

import type { NeuralAnalysisStatus, NeuralDroneSnapshot } from './types';

export interface NeuralDroneController {
  analyzeSelectedSample(): void;
}

class NeuralDroneAnalyzerStateImpl {
  private status: NeuralAnalysisStatus = 'idle';
  private modelReady = false;
  private lastResult: DetectionResult | null = null;
  private analyzedSampleId: string | null = null;
  private analyzedSampleTitle: string | null = null;
  private selectedSampleId: string | null = null;
  private selectedSampleTitle: string | null = null;
  private blockedReason: string | null = null;
  private errorMessage: string | null = null;

  private listeners = new Set<() => void>();
  private snapshotCache: NeuralDroneSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): NeuralDroneSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setSampleContext(params: {
    selectedSampleId: string | null;
    selectedSampleTitle: string | null;
    blockedReason: string | null;
  }): void {
    this.selectedSampleId = params.selectedSampleId;
    this.selectedSampleTitle = params.selectedSampleTitle;
    this.blockedReason = params.blockedReason;
    this.rebuild();
  }

  beginModelLoading(): void {
    this.status = 'model-loading';
    this.errorMessage = null;
    this.rebuild();
  }

  finishModelLoading(): void {
    this.modelReady = true;
    if (this.status === 'model-loading') this.status = 'idle';
    this.rebuild();
  }

  /** Провал прогрева — отдельный статус: анализ ещё не запускался (P2#2 ревью ND2). */
  failModelLoading(message: string): void {
    this.status = 'model-error';
    this.modelReady = false;
    this.errorMessage = message;
    this.rebuild();
  }

  beginAnalysis(sampleId: string, sampleTitle: string | null): void {
    this.status = 'analyzing';
    this.analyzedSampleId = sampleId;
    this.analyzedSampleTitle = sampleTitle;
    this.errorMessage = null;
    this.rebuild();
  }

  finishAnalysis(result: DetectionResult): void {
    this.status = 'ready';
    this.modelReady = true;
    this.lastResult = result;
    this.rebuild();
  }

  failAnalysis(message: string): void {
    this.status = 'error';
    this.errorMessage = message;
    this.rebuild();
  }

  reset(): void {
    this.status = 'idle';
    this.modelReady = false;
    this.lastResult = null;
    this.analyzedSampleId = null;
    this.analyzedSampleTitle = null;
    this.selectedSampleId = null;
    this.selectedSampleTitle = null;
    this.blockedReason = null;
    this.errorMessage = null;
    this.rebuild();
  }

  private buildSnapshot(): NeuralDroneSnapshot {
    return {
      status: this.status,
      modelReady: this.modelReady,
      lastResult: this.lastResult,
      analyzedSampleId: this.analyzedSampleId,
      analyzedSampleTitle: this.analyzedSampleTitle,
      selectedSampleId: this.selectedSampleId,
      selectedSampleTitle: this.selectedSampleTitle,
      blockedReason: this.blockedReason,
      errorMessage: this.errorMessage,
    };
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}

export const neuralDroneAnalyzerState = new NeuralDroneAnalyzerStateImpl();

let controller: NeuralDroneController | null = null;

export function registerNeuralDroneController(next: NeuralDroneController | null): void {
  controller = next;
}

export function getNeuralDroneController(): NeuralDroneController | null {
  return controller;
}
