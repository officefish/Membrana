import type {
  FrameVerdict,
  StrictnessLevel,
  ThresholdTestFrameCount,
  ThresholdTestResult,
  ThresholdTestThresholds,
} from '@membrana/fft-analyzer-service';

export type TestPhase = 'idle' | 'collecting' | 'result';
export type FrameTickState = 'pending' | 'passed' | 'failed';

export interface CurrentFramePreview {
  readonly centroid: number;
  readonly flux: number;
  readonly rms: number;
  readonly centroidOk: boolean;
  readonly fluxOk: boolean;
  readonly rmsOk: boolean;
}

export interface FftThresholdSnapshot {
  readonly live: boolean;
  readonly phase: TestPhase;
  readonly mode: 'manual' | 'auto';
  readonly frameCount: ThresholdTestFrameCount;
  readonly collectedCount: number;
  readonly tickStates: readonly FrameTickState[];
  readonly currentFrame: CurrentFramePreview | null;
  readonly lastResult: ThresholdTestResult | null;
  readonly strictness: StrictnessLevel;
  readonly thresholds: ThresholdTestThresholds;
  readonly intervalMs: number;
}

const emptyTicks = (n: number): FrameTickState[] =>
  Array.from({ length: n }, () => 'pending' as const);

class FftThresholdPluginStateImpl {
  private live = false;
  private phase: TestPhase = 'idle';
  private mode: 'manual' | 'auto' = 'auto';
  private frameCount: ThresholdTestFrameCount = 3;
  private collectedCount = 0;
  private tickStates: FrameTickState[] = emptyTicks(3);
  private currentFrame: CurrentFramePreview | null = null;
  private lastResult: ThresholdTestResult | null = null;
  private strictness: StrictnessLevel = 'normal';
  private thresholds: ThresholdTestThresholds = {
    centroid: { min: 200, max: 800 },
    flux: { min: 0, max: 1.5 },
    rms: { min: 0.01, max: 1.0 },
  };
  private intervalMs = 500;

  private listeners = new Set<() => void>();
  private snapshotCache: FftThresholdSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): FftThresholdSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  syncConfig(config: {
    mode: 'manual' | 'auto';
    frameCount: ThresholdTestFrameCount;
    strictness: StrictnessLevel;
    thresholds: ThresholdTestThresholds;
    intervalMs: number;
  }): void {
    this.mode = config.mode;
    this.frameCount = config.frameCount;
    this.strictness = config.strictness;
    this.thresholds = config.thresholds;
    this.intervalMs = config.intervalMs;
    if (this.phase === 'idle') {
      this.tickStates = emptyTicks(config.frameCount);
      this.collectedCount = 0;
    }
    this.rebuild();
  }

  setLive(live: boolean): void {
    if (this.live === live) return;
    this.live = live;
    this.rebuild();
  }

  setPhase(phase: TestPhase): void {
    this.phase = phase;
    this.rebuild();
  }

  beginCollection(frameCount: ThresholdTestFrameCount): void {
    this.phase = 'collecting';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(frameCount);
    this.currentFrame = null;
    this.lastResult = null;
    this.rebuild();
  }

  updateCollecting(params: {
    collectedCount: number;
    tickStates: FrameTickState[];
    currentFrame: CurrentFramePreview | null;
  }): void {
    this.collectedCount = params.collectedCount;
    this.tickStates = params.tickStates;
    this.currentFrame = params.currentFrame;
    this.rebuild();
  }

  finishTest(result: ThresholdTestResult, tickStates: FrameTickState[]): void {
    this.phase = 'result';
    this.lastResult = result;
    this.tickStates = tickStates;
    this.collectedCount = result.frameCount;
    this.currentFrame = null;
    this.rebuild();
  }

  showResultFromLastTest(): void {
    if (this.lastResult) {
      this.phase = 'result';
      this.tickStates = this.lastResult.frames.map((f) =>
        f.framePassed ? 'passed' : 'failed',
      );
      this.collectedCount = this.lastResult.frameCount;
    }
    this.rebuild();
  }

  resetToIdle(frameCount: ThresholdTestFrameCount): void {
    this.phase = 'idle';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(frameCount);
    this.currentFrame = null;
    this.rebuild();
  }

  reset(): void {
    this.live = false;
    this.phase = 'idle';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(this.frameCount);
    this.currentFrame = null;
    this.lastResult = null;
    this.rebuild();
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): FftThresholdSnapshot {
    return {
      live: this.live,
      phase: this.phase,
      mode: this.mode,
      frameCount: this.frameCount,
      collectedCount: this.collectedCount,
      tickStates: this.tickStates,
      currentFrame: this.currentFrame,
      lastResult: this.lastResult,
      strictness: this.strictness,
      thresholds: this.thresholds,
      intervalMs: this.intervalMs,
    };
  }
}

export const fftThresholdPluginState = new FftThresholdPluginStateImpl();

export function verdictsToTickStates(frames: readonly FrameVerdict[]): FrameTickState[] {
  return frames.map((f) => (f.framePassed ? 'passed' : 'failed'));
}

type TestController = {
  startManualTest: () => void;
  stopTest: () => void;
};

let activeController: TestController | null = null;

export function registerFftThresholdTestController(ctrl: TestController | null): void {
  activeController = ctrl;
}

export function requestStartManualTest(): void {
  activeController?.startManualTest();
}

export function requestStopThresholdTest(): void {
  activeController?.stopTest();
}
