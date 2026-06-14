import { clamp01 } from '../../lib/fftMetricNormalize';

import {
  ActivityEnvelope,
  createFftIndicesActivityEnvelopes,
  preprocessFftIndicesSample,
} from './fftIndicesVizNormalize';
import type { FftIndicesVizPluginConfig } from './types';

export const FLUX_HISTORY_MAX = 200;

export interface FftIndicesSnapshot {
  readonly streamActive: boolean;
  readonly centroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly centroidNorm: number;
  readonly fluxNorm: number;
  readonly rmsNorm: number;
  readonly fluxHistory: readonly number[];
  readonly config: FftIndicesVizPluginConfig;
}

const defaultConfig: FftIndicesVizPluginConfig = {
  vizMode: 'bars',
  showDroneZone: true,
  displaySmoothing: 0.55,
};

class FftIndicesVizPluginStateImpl {
  private streamActive = false;
  private displayCentroidHz = 0;
  private displayFlux = 0;
  private displayRms = 0;
  private centroidActivity: ActivityEnvelope;
  private fluxActivity: ActivityEnvelope;
  private rmsActivity: ActivityEnvelope;
  private fluxRing: number[] = [];
  private config: FftIndicesVizPluginConfig = { ...defaultConfig };
  private readonly listeners = new Set<() => void>();
  private snapshotCache: FftIndicesSnapshot;

  constructor() {
    const envelopes = createFftIndicesActivityEnvelopes();
    this.centroidActivity = envelopes.centroid;
    this.fluxActivity = envelopes.flux;
    this.rmsActivity = envelopes.rms;
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): FftIndicesSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  syncConfig(config: FftIndicesVizPluginConfig): void {
    this.config = config;
    this.rebuild();
  }

  setStreamActive(active: boolean): void {
    if (this.streamActive === active) return;
    this.streamActive = active;
    if (!active) {
      this.resetSamples();
    }
    this.rebuild();
  }

  pushFrame(centroidHz: number, flux: number, rms: number): void {
    const pre = preprocessFftIndicesSample(centroidHz, flux, rms);
    const alpha = clamp01(this.config.displaySmoothing);
    const blend = (prev: number, next: number) =>
      alpha * prev + (1 - alpha) * next;

    this.displayCentroidHz = blend(this.displayCentroidHz, pre.centroidHz);
    this.displayFlux = blend(this.displayFlux, pre.flux);
    this.displayRms = blend(this.displayRms, pre.rms);

    const centroidNorm = this.centroidActivity.normalize(this.displayCentroidHz);
    const fluxNorm = this.fluxActivity.normalize(this.displayFlux);
    const rmsNorm = this.rmsActivity.normalize(this.displayRms);

    this.fluxRing.push(fluxNorm);
    if (this.fluxRing.length > FLUX_HISTORY_MAX) {
      this.fluxRing.shift();
    }

    this.snapshotCache = {
      streamActive: this.streamActive,
      centroidHz: this.displayCentroidHz,
      flux: this.displayFlux,
      rms: this.displayRms,
      centroidNorm,
      fluxNorm,
      rmsNorm,
      fluxHistory: [...this.fluxRing],
      config: this.config,
    };
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
    this.displayCentroidHz = 0;
    this.displayFlux = 0;
    this.displayRms = 0;
    this.fluxRing = [];
    this.centroidActivity.reset();
    this.fluxActivity.reset();
    this.rmsActivity.reset();
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private buildSnapshot(): FftIndicesSnapshot {
    return {
      streamActive: this.streamActive,
      centroidHz: this.displayCentroidHz,
      flux: this.displayFlux,
      rms: this.displayRms,
      centroidNorm: this.centroidActivity.normalize(this.displayCentroidHz),
      fluxNorm: this.fluxActivity.normalize(this.displayFlux),
      rmsNorm: this.rmsActivity.normalize(this.displayRms),
      fluxHistory: [...this.fluxRing],
      config: this.config,
    };
  }
}

export const fftIndicesVizPluginState = new FftIndicesVizPluginStateImpl();
