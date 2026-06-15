import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetectionReport } from '@membrana/detector-report';

import type { MicLiveDroneAnalysisStatus, MicLiveDroneSnapshot } from './types';

class MicLiveDronePluginStateImpl {
  private lastSampleId: string | null = null;
  private lastSampleTitle: string | null = null;
  private lastJournalTrackId: string | null = null;
  private status: MicLiveDroneAnalysisStatus = 'idle';
  private verdicts: SampleDetectionVerdict[] = [];
  private detectionReport: DroneDetectionReport | null = null;
  private analyzedSampleId: string | null = null;
  private errorMessage: string | null = null;

  private listeners = new Set<() => void>();
  private snapshotCache: MicLiveDroneSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): MicLiveDroneSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setImportContext(params: {
    sampleId: string;
    sampleTitle: string;
    journalTrackId: string | null;
  }): void {
    this.lastSampleId = params.sampleId;
    this.lastSampleTitle = params.sampleTitle;
    this.lastJournalTrackId = params.journalTrackId;
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
    this.lastSampleId = null;
    this.lastSampleTitle = null;
    this.lastJournalTrackId = null;
    this.status = 'idle';
    this.verdicts = [];
    this.detectionReport = null;
    this.analyzedSampleId = null;
    this.errorMessage = null;
    this.rebuild();
  }

  private buildSnapshot(): MicLiveDroneSnapshot {
    return {
      lastSampleId: this.lastSampleId,
      lastSampleTitle: this.lastSampleTitle,
      lastJournalTrackId: this.lastJournalTrackId,
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

export const micLiveDronePluginState = new MicLiveDronePluginStateImpl();
