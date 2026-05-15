import {
  evaluateSoundQuality,
  soundQualityBadge,
  soundQualityHint,
  type SoundQualityMetrics,
  type SoundQualityBadge,
} from '@membrana/fft-analyzer-service';

import {
  defaultSoundQualityVizConfig,
  resolveSoundQualityVizConfig,
  type SoundQualityVizPluginConfig,
} from './types';

export interface SoundQualitySnapshot {
  readonly streamActive: boolean;
  readonly centroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly rmsHistory: readonly number[];
  readonly metrics: SoundQualityMetrics;
  readonly qualityMessage: string;
  readonly badge: SoundQualityBadge;
  readonly config: SoundQualityVizPluginConfig;
}

const emptyMetrics: SoundQualityMetrics = {
  snr: 0,
  clarity: 0,
  dynamics: 0,
  peakDb: -60,
  overall: 0,
};

class SoundQualityVizPluginStateImpl {
  private streamActive = false;
  private centroidHz = 0;
  private flux = 0;
  private rms = 0;
  private rmsRing: number[] = [];
  private config: SoundQualityVizPluginConfig = { ...defaultSoundQualityVizConfig };
  private readonly listeners = new Set<() => void>();
  private snapshotCache: SoundQualitySnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): SoundQualitySnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  syncConfig(config: SoundQualityVizPluginConfig): void {
    this.config = config;
    const max = config.rmsHistorySize;
    if (this.rmsRing.length > max) {
      this.rmsRing = this.rmsRing.slice(-max);
    }
    this.rebuild();
  }

  setStreamActive(active: boolean): void {
    if (this.streamActive === active) return;
    this.streamActive = active;
    if (!active) this.resetSamples();
    this.rebuild();
  }

  pushFrame(centroidHz: number, flux: number, rms: number): void {
    this.centroidHz = centroidHz;
    this.flux = flux;
    this.rms = rms;

    this.rmsRing.push(rms);
    const max = this.config.rmsHistorySize;
    if (this.rmsRing.length > max) {
      this.rmsRing.shift();
    }

    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  reset(): void {
    this.streamActive = false;
    this.resetSamples();
    this.rebuild();
  }

  private resetSamples(): void {
    this.centroidHz = 0;
    this.flux = 0;
    this.rms = 0;
    this.rmsRing = [];
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private buildSnapshot(): SoundQualitySnapshot {
    const config = resolveSoundQualityVizConfig(this.config);
    const input = {
      centroidHz: this.centroidHz,
      flux: this.flux,
      rms: this.rms,
      rmsHistory: this.rmsRing,
    };
    const options = {
      loudnessRefMax: config.loudnessRefMax,
      weights: config.weights,
    };
    const metrics =
      this.rmsRing.length > 0
        ? evaluateSoundQuality(input, options)
        : { ...emptyMetrics };

    return {
      streamActive: this.streamActive,
      centroidHz: this.centroidHz,
      flux: this.flux,
      rms: this.rms,
      rmsHistory: [...this.rmsRing],
      metrics,
      qualityMessage: soundQualityHint(metrics, input, options),
      badge: soundQualityBadge(metrics.overall),
      config,
    };
  }
}

export const soundQualityVizPluginState = new SoundQualityVizPluginStateImpl();
