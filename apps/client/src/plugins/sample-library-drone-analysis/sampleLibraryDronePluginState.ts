import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetectionReport } from '@membrana/detector-report';

import type { SampleLibraryDroneAnalysisStatus, SampleLibraryDroneSnapshot } from './types';

class SampleLibraryDronePluginStateImpl {
  private selectedSampleId: string | null = null;
  private selectedSampleTitle: string | null = null;
  private status: SampleLibraryDroneAnalysisStatus = 'idle';
  private verdicts: SampleDetectionVerdict[] = [];
  private detectionReport: DroneDetectionReport | null = null;
  private analyzedSampleId: string | null = null;
  private errorMessage: string | null = null;

  private listeners = new Set<() => void>();
  private snapshotCache: SampleLibraryDroneSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): SampleLibraryDroneSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setSampleContext(params: {
    selectedSampleId: string | null;
    selectedSampleTitle: string | null;
  }): void {
    const sampleChanged = params.selectedSampleId !== this.selectedSampleId;
    this.selectedSampleId = params.selectedSampleId;
    this.selectedSampleTitle = params.selectedSampleTitle;

    if (sampleChanged && this.analyzedSampleId !== params.selectedSampleId) {
      this.verdicts = [];
      this.detectionReport = null;
      this.analyzedSampleId = null;
      this.errorMessage = null;
      if (this.status !== 'loading') {
        this.status = 'idle';
      }
    }

    this.rebuild();
  }

  beginAnalysis(sampleId: string): void {
    this.status = 'loading';
    this.errorMessage = null;
    this.analyzedSampleId = sampleId;
    this.rebuild();
  }

  finishAnalysis(
    sampleId: string,
    verdicts: readonly SampleDetectionVerdict[],
    report: DroneDetectionReport,
  ): void {
    this.status = 'ready';
    this.analyzedSampleId = sampleId;
    this.verdicts = [...verdicts];
    this.detectionReport = report;
    this.errorMessage = null;
    this.rebuild();
  }

  failAnalysis(message: string): void {
    this.status = 'error';
    this.verdicts = [];
    this.detectionReport = null;
    this.errorMessage = message;
    this.rebuild();
  }

  reset(): void {
    this.selectedSampleId = null;
    this.selectedSampleTitle = null;
    this.status = 'idle';
    this.verdicts = [];
    this.detectionReport = null;
    this.analyzedSampleId = null;
    this.errorMessage = null;
    this.rebuild();
  }

  private buildSnapshot(): SampleLibraryDroneSnapshot {
    return {
      selectedSampleId: this.selectedSampleId,
      selectedSampleTitle: this.selectedSampleTitle,
      status: this.status,
      verdicts: this.verdicts,
      detectionReport: this.detectionReport,
      analyzedSampleId: this.analyzedSampleId,
      errorMessage: this.errorMessage,
    };
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}

export const sampleLibraryDronePluginState = new SampleLibraryDronePluginStateImpl();

type DroneAnalysisController = {
  analyzeSelectedSample: () => void;
};

let controller: DroneAnalysisController | null = null;

export function registerSampleLibraryDroneController(
  next: DroneAnalysisController | null,
): void {
  controller = next;
}

export function requestSampleLibraryDroneAnalysis(): void {
  controller?.analyzeSelectedSample();
}
