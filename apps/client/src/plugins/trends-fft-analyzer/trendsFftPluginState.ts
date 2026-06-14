import type { TrendsDetectionResult } from '@membrana/trends-detector-service';

export type TrendsPhase = 'idle' | 'collecting' | 'result';
export type TrendsTickState = 'pending' | 'collected';

export interface TrendsCurrentSamplePreview {
  readonly centroid: number;
  readonly flux: number;
  readonly rms: number;
}

export interface TrendsFftSnapshot {
  readonly live: boolean;
  readonly phase: TrendsPhase;
  readonly mode: 'manual' | 'auto';
  readonly measurementsCount: number;
  readonly collectedCount: number;
  readonly tickStates: readonly TrendsTickState[];
  readonly currentSample: TrendsCurrentSamplePreview | null;
  readonly lastResult: TrendsDetectionResult | null;
  readonly intervalMs: number;
  readonly minRms: number;
}

const emptyTicks = (n: number): TrendsTickState[] =>
  Array.from({ length: n }, () => 'pending' as const);

class TrendsFftPluginStateImpl {
  private live = false;
  private phase: TrendsPhase = 'idle';
  private mode: 'manual' | 'auto' = 'auto';
  private measurementsCount = 100;
  private collectedCount = 0;
  private tickStates: TrendsTickState[] = emptyTicks(100);
  private currentSample: TrendsCurrentSamplePreview | null = null;
  private lastResult: TrendsDetectionResult | null = null;
  private intervalMs = 100;
  private minRms = 0.02;

  private listeners = new Set<() => void>();
  private snapshotCache: TrendsFftSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): TrendsFftSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  syncConfig(config: {
    mode: 'manual' | 'auto';
    measurementsCount: number;
    intervalMs: number;
    minRms: number;
  }): void {
    const countChanged = this.measurementsCount !== config.measurementsCount;
    const unchanged =
      this.mode === config.mode &&
      !countChanged &&
      this.intervalMs === config.intervalMs &&
      this.minRms === config.minRms;
    if (unchanged) return;

    this.mode = config.mode;
    this.measurementsCount = config.measurementsCount;
    this.intervalMs = config.intervalMs;
    this.minRms = config.minRms;
    if (this.phase === 'idle' && countChanged) {
      this.tickStates = emptyTicks(config.measurementsCount);
      this.collectedCount = 0;
    }
    this.rebuild();
  }

  setLive(live: boolean): void {
    if (this.live === live) return;
    this.live = live;
    this.rebuild();
  }

  beginCollection(measurementsCount: number): void {
    this.phase = 'collecting';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(measurementsCount);
    this.currentSample = null;
    this.lastResult = null;
    this.rebuild();
  }

  updateCollecting(params: {
    collectedCount: number;
    tickStates: TrendsTickState[];
    currentSample: TrendsCurrentSamplePreview | null;
  }): void {
    this.collectedCount = params.collectedCount;
    this.tickStates = params.tickStates;
    this.currentSample = params.currentSample;
    this.rebuild();
  }

  finishCollection(result: TrendsDetectionResult): void {
    this.phase = 'result';
    this.lastResult = result;
    this.rebuild();
  }

  resetToIdle(measurementsCount: number): void {
    this.phase = 'idle';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(measurementsCount);
    this.currentSample = null;
    this.rebuild();
  }

  /** Сброс незавершённого цикла (остановка потока, прерывание). */
  abortCollection(measurementsCount: number): void {
    this.phase = 'idle';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(measurementsCount);
    this.currentSample = null;
    this.lastResult = null;
    this.rebuild();
  }

  reset(): void {
    this.live = false;
    this.phase = 'idle';
    this.mode = 'auto';
    this.measurementsCount = 100;
    this.collectedCount = 0;
    this.tickStates = emptyTicks(100);
    this.currentSample = null;
    this.lastResult = null;
    this.intervalMs = 100;
    this.minRms = 0.02;
    this.rebuild();
  }

  private buildSnapshot(): TrendsFftSnapshot {
    return {
      live: this.live,
      phase: this.phase,
      mode: this.mode,
      measurementsCount: this.measurementsCount,
      collectedCount: this.collectedCount,
      tickStates: this.tickStates,
      currentSample: this.currentSample,
      lastResult: this.lastResult,
      intervalMs: this.intervalMs,
      minRms: this.minRms,
    };
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const trendsFftPluginState = new TrendsFftPluginStateImpl();

type TrendsController = {
  startManualCollection: () => void;
  stopCollection: () => void;
};

let controller: TrendsController | null = null;

export function registerTrendsFftController(next: TrendsController | null): void {
  controller = next;
}

export function requestStartManualTrendsCollection(): void {
  controller?.startManualCollection();
}

export function requestStopTrendsCollection(): void {
  controller?.stopCollection();
}
