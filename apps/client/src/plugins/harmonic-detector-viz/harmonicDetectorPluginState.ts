import { defaultHarmonicDetectorVizConfig, type HarmonicDetectorVizPluginConfig } from './types';

export interface HarmonicDetectionSnapshot {
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly reasoning?: string;
  readonly fundamentals?: readonly number[];
  readonly latencyMs?: number;
  readonly rawConfidence?: number;
}

export interface HarmonicPluginSnapshot {
  readonly live: boolean;
  readonly detection: HarmonicDetectionSnapshot | null;
  readonly confidenceThreshold: number;
  readonly analysisError: string | null;
}

class HarmonicDetectorPluginStateImpl {
  private live = false;
  private detection: HarmonicDetectionSnapshot | null = null;
  private confidenceThreshold = defaultHarmonicDetectorVizConfig.confidenceThreshold;
  private analysisError: string | null = null;
  private listeners = new Set<() => void>();
  private snapshotCache: HarmonicPluginSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): HarmonicPluginSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setLive(live: boolean): void {
    if (this.live === live) return;
    this.live = live;
    if (!live) {
      this.detection = null;
      this.analysisError = null;
    }
    this.rebuild();
  }

  setDetection(detection: HarmonicDetectionSnapshot | null): void {
    if (detection === this.detection) return;
    if (
      detection != null &&
      this.detection != null &&
      detection.isDrone === this.detection.isDrone &&
      detection.confidence === this.detection.confidence &&
      detection.reasoning === this.detection.reasoning &&
      detection.latencyMs === this.detection.latencyMs &&
      detection.rawConfidence === this.detection.rawConfidence &&
      detection.fundamentals === this.detection.fundamentals
    ) {
      return;
    }
    this.detection = detection;
    this.rebuild();
  }

  setAnalysisError(error: string | null): void {
    if (this.analysisError === error) return;
    this.analysisError = error;
    this.rebuild();
  }

  setConfidenceThreshold(threshold: number): void {
    if (this.confidenceThreshold === threshold) return;
    this.confidenceThreshold = threshold;
    this.rebuild();
  }

  applyConfig(config: HarmonicDetectorVizPluginConfig): void {
    this.setConfidenceThreshold(config.confidenceThreshold);
  }

  reset(): void {
    this.live = false;
    this.detection = null;
    this.analysisError = null;
    this.rebuild();
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private buildSnapshot(): HarmonicPluginSnapshot {
    return {
      live: this.live,
      detection: this.detection,
      confidenceThreshold: this.confidenceThreshold,
      analysisError: this.analysisError,
    };
  }
}

export const harmonicDetectorPluginState = new HarmonicDetectorPluginStateImpl();
