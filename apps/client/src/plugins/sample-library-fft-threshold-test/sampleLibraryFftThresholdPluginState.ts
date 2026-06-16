import type { FftThresholdTestReport } from '../fft-threshold-test/buildFftThresholdTestReport';

export type SampleFftThresholdStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SampleFftThresholdSnapshot {
  readonly status: SampleFftThresholdStatus;
  readonly selectedSampleId: string | null;
  readonly selectedSampleTitle: string | null;
  readonly analyzedSampleId: string | null;
  readonly report: FftThresholdTestReport | null;
  readonly errorMessage: string | null;
}

class SampleLibraryFftThresholdStateImpl {
  private status: SampleFftThresholdStatus = 'idle';
  private selectedSampleId: string | null = null;
  private selectedSampleTitle: string | null = null;
  private analyzedSampleId: string | null = null;
  private report: FftThresholdTestReport | null = null;
  private errorMessage: string | null = null;

  private listeners = new Set<() => void>();
  private snapshotCache: SampleFftThresholdSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): SampleFftThresholdSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setSampleContext(context: {
    selectedSampleId: string | null;
    selectedSampleTitle: string | null;
  }): void {
    if (
      context.selectedSampleId === this.selectedSampleId &&
      context.selectedSampleTitle === this.selectedSampleTitle
    ) {
      return;
    }
    this.selectedSampleId = context.selectedSampleId;
    this.selectedSampleTitle = context.selectedSampleTitle;
    this.rebuild();
  }

  beginAnalysis(sampleId: string): void {
    this.status = 'loading';
    this.errorMessage = null;
    this.analyzedSampleId = sampleId;
    this.rebuild();
  }

  finishAnalysis(sampleId: string, report: FftThresholdTestReport): void {
    this.status = 'ready';
    this.analyzedSampleId = sampleId;
    this.report = report;
    this.errorMessage = null;
    this.rebuild();
  }

  failAnalysis(message: string): void {
    this.status = 'error';
    this.errorMessage = message;
    this.rebuild();
  }

  reset(): void {
    this.status = 'idle';
    this.selectedSampleId = null;
    this.selectedSampleTitle = null;
    this.analyzedSampleId = null;
    this.report = null;
    this.errorMessage = null;
    this.rebuild();
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): SampleFftThresholdSnapshot {
    return {
      status: this.status,
      selectedSampleId: this.selectedSampleId,
      selectedSampleTitle: this.selectedSampleTitle,
      analyzedSampleId: this.analyzedSampleId,
      report: this.report,
      errorMessage: this.errorMessage,
    };
  }
}

export const sampleLibraryFftThresholdState = new SampleLibraryFftThresholdStateImpl();

type SampleFftThresholdController = {
  analyzeSelectedSample: () => void;
};

let activeController: SampleFftThresholdController | null = null;

export function registerSampleLibraryFftThresholdController(
  ctrl: SampleFftThresholdController | null,
): void {
  activeController = ctrl;
}

export function requestSampleLibraryFftThresholdAnalysis(): void {
  activeController?.analyzeSelectedSample();
}
