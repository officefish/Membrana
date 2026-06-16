import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetectionBriefReport, DroneDetectionReport } from '@membrana/detector-report';

import {
  defaultMicLiveDroneAnalysisConfig,
  type MicLiveDroneAnalysisMode,
  type MicLiveDroneAnalysisStatus,
  type MicLiveDroneSnapshot,
  type MicLiveDroneStreamPhase,
} from './types';

export interface MicLiveDroneController {
  readonly startManualWindow: () => void;
}

let controller: MicLiveDroneController | null = null;

export function registerMicLiveDroneController(ctrl: MicLiveDroneController | null): void {
  controller = ctrl;
}

export function requestStartManualStreamWindow(): void {
  controller?.startManualWindow();
}

class MicLiveDronePluginStateImpl {
  private analysisMode: MicLiveDroneAnalysisMode =
    defaultMicLiveDroneAnalysisConfig.analysisMode;
  private streamPhase: MicLiveDroneStreamPhase = 'idle';
  private streamWindowSec = defaultMicLiveDroneAnalysisConfig.streamWindowSec;
  private streamPauseSec = defaultMicLiveDroneAnalysisConfig.streamPauseSec;
  private streamElapsedMs = 0;
  private streamLive = false;
  private lastSampleId: string | null = null;
  private lastSampleTitle: string | null = null;
  private lastJournalTrackId: string | null = null;
  private status: MicLiveDroneAnalysisStatus = 'idle';
  private verdicts: SampleDetectionVerdict[] = [];
  private briefReport: DroneDetectionBriefReport | null = null;
  private detailedReport: DroneDetectionReport | null = null;
  private analyzedSampleId: string | null = null;
  private lastStreamReportId: string | null = null;
  private errorMessage: string | null = null;
  private trackQueuedTitle: string | null = null;
  private trackSkippedCount = 0;

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

  syncConfig(params: {
    analysisMode: MicLiveDroneAnalysisMode;
    streamWindowSec: number;
    streamPauseSec: number;
  }): void {
    this.analysisMode = params.analysisMode;
    this.streamWindowSec = params.streamWindowSec;
    this.streamPauseSec = params.streamPauseSec;
    this.rebuild();
  }

  setStreamLive(live: boolean): void {
    this.streamLive = live;
    if (!live) {
      this.streamPhase = 'idle';
      this.streamElapsedMs = 0;
    }
    this.rebuild();
  }

  beginStreamCollection(): void {
    this.streamPhase = 'collecting';
    this.streamElapsedMs = 0;
    this.status = 'loading';
    this.errorMessage = null;
    this.rebuild();
  }

  updateStreamElapsed(elapsedMs: number): void {
    this.streamElapsedMs = elapsedMs;
    this.rebuild();
  }

  beginStreamFinalize(): void {
    this.streamPhase = 'finalizing';
    this.rebuild();
  }

  beginStreamPause(): void {
    this.streamPhase = 'pause';
    this.streamElapsedMs = 0;
    this.rebuild();
  }

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

  setTrackQueued(title: string | null): void {
    this.trackQueuedTitle = title;
    this.rebuild();
  }

  incrementTrackSkipped(): void {
    this.trackSkippedCount += 1;
    this.rebuild();
  }

  finishAnalysis(
    sampleId: string,
    verdicts: readonly SampleDetectionVerdict[],
    report: DroneDetectionBriefReport,
  ): void {
    this.status = 'ready';
    this.analyzedSampleId = sampleId;
    this.verdicts = [...verdicts];
    this.briefReport = report;
    this.detailedReport = null;
    this.errorMessage = null;
    this.rebuild();
  }

  finishStreamCycle(
    verdicts: readonly SampleDetectionVerdict[],
    report: DroneDetectionBriefReport,
  ): void {
    this.status = 'ready';
    this.analyzedSampleId = report.meta.sampleId;
    this.verdicts = [...verdicts];
    this.briefReport = report;
    this.detailedReport = null;
    this.lastStreamReportId = report.meta.reportId;
    this.errorMessage = null;
    this.streamPhase = 'pause';
    this.streamElapsedMs = 0;
    this.rebuild();
  }

  setDetailedReportPending(reportId: string): void {
    if (!this.briefReport || this.briefReport.meta.reportId !== reportId) return;
    this.briefReport = {
      ...this.briefReport,
      meta: {
        ...this.briefReport.meta,
        detailedReportStatus: 'pending',
      },
    };
    this.rebuild();
  }

  setDetailedReportReady(report: DroneDetectionReport): void {
    this.detailedReport = report;
    if (this.briefReport) {
      this.briefReport = {
        ...this.briefReport,
        meta: {
          ...this.briefReport.meta,
          detailedReportStatus: 'ready',
          detailedReportId: report.meta.reportId,
        },
      };
    }
    this.rebuild();
  }

  setDetailedReportError(reportId: string, message: string): void {
    if (!this.briefReport || this.briefReport.meta.reportId !== reportId) return;
    this.briefReport = {
      ...this.briefReport,
      meta: {
        ...this.briefReport.meta,
        detailedReportStatus: 'error',
        detailedReportError: message,
      },
    };
    this.rebuild();
  }

  failAnalysis(message: string): void {
    this.status = 'error';
    this.verdicts = [];
    this.briefReport = null;
    this.detailedReport = null;
    this.errorMessage = message;
    this.streamPhase = 'idle';
    this.rebuild();
  }

  resetToIdleAfterStream(): void {
    // Keep `status`/`briefReport`/`verdicts` so the last stream result stays
    // visible in the panel until the next window finalizes (manual mode would
    // otherwise flash the report and immediately hide it). Only the live phase
    // returns to idle.
    this.streamPhase = 'idle';
    this.streamElapsedMs = 0;
    this.rebuild();
  }

  reset(): void {
    this.analysisMode = defaultMicLiveDroneAnalysisConfig.analysisMode;
    this.streamPhase = 'idle';
    this.streamWindowSec = defaultMicLiveDroneAnalysisConfig.streamWindowSec;
    this.streamPauseSec = defaultMicLiveDroneAnalysisConfig.streamPauseSec;
    this.streamElapsedMs = 0;
    this.streamLive = false;
    this.lastSampleId = null;
    this.lastSampleTitle = null;
    this.lastJournalTrackId = null;
    this.status = 'idle';
    this.verdicts = [];
    this.briefReport = null;
    this.detailedReport = null;
    this.analyzedSampleId = null;
    this.lastStreamReportId = null;
    this.errorMessage = null;
    this.trackQueuedTitle = null;
    this.trackSkippedCount = 0;
    this.rebuild();
  }

  private buildSnapshot(): MicLiveDroneSnapshot {
    return {
      analysisMode: this.analysisMode,
      streamPhase: this.streamPhase,
      streamWindowSec: this.streamWindowSec,
      streamPauseSec: this.streamPauseSec,
      streamElapsedMs: this.streamElapsedMs,
      streamLive: this.streamLive,
      lastSampleId: this.lastSampleId,
      lastSampleTitle: this.lastSampleTitle,
      lastJournalTrackId: this.lastJournalTrackId,
      status: this.status,
      verdicts: this.verdicts,
      briefReport: this.briefReport,
      detailedReport: this.detailedReport,
      analyzedSampleId: this.analyzedSampleId,
      lastStreamReportId: this.lastStreamReportId,
      errorMessage: this.errorMessage,
      trackQueuedTitle: this.trackQueuedTitle,
      trackSkippedCount: this.trackSkippedCount,
    };
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}

export const micLiveDronePluginState = new MicLiveDronePluginStateImpl();
