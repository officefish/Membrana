import type { TrendsDetectionResult } from '@membrana/trends-detector-service';

import type { TrendsFftReport } from '../trends-fft-analyzer/buildTrendsFftReport';

import type { SampleDurationPlan } from './sampleDurationPolicy';
import type { TrendsFftSampleAnalysisStatus, TrendsFftSampleSnapshot } from './types';

type TickState = 'pending' | 'collected';

const emptyTicks = (n: number): TickState[] =>
  Array.from({ length: n }, () => 'pending' as const);

class TrendsFftSamplePluginStateImpl {
  private ready = false;
  private phase: TrendsFftSampleSnapshot['phase'] = 'idle';
  private analysisStatus: TrendsFftSampleAnalysisStatus = 'idle';
  private measurementsCount = 10;
  private collectedCount = 0;
  private tickStates: TickState[] = emptyTicks(10);
  private currentSample: TrendsFftSampleSnapshot['currentSample'] = null;
  private lastResult: TrendsDetectionResult | null = null;
  private lastReport: TrendsFftReport | null = null;
  private analyzedSampleId: string | null = null;
  private errorMessage: string | null = null;
  private intervalMs = 500;
  private minRms = 0.02;
  private selectedSampleId: string | null = null;
  private selectedSampleTitle: string | null = null;
  private durationPlan: SampleDurationPlan | null = null;
  private blockedReason: string | null = null;
  /** Параметры окна, с которыми получен lastResult (для перезапуска при смене). */
  private resultAnalysisParams: { measurementsCount: number; intervalMs: number } | null = null;

  private listeners = new Set<() => void>();
  private snapshotCache: TrendsFftSampleSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): TrendsFftSampleSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setSampleContext(params: {
    selectedSampleId: string | null;
    selectedSampleTitle: string | null;
    durationPlan: SampleDurationPlan | null;
    blockedReason: string | null;
    ready: boolean;
  }): void {
    this.selectedSampleId = params.selectedSampleId;
    this.selectedSampleTitle = params.selectedSampleTitle;
    this.durationPlan = params.durationPlan;
    this.blockedReason = params.blockedReason;
    this.ready = params.ready;
    this.rebuild();
  }

  syncConfig(config: {
    measurementsCount: number;
    intervalMs: number;
    minRms: number;
  }): void {
    const countChanged = this.measurementsCount !== config.measurementsCount;
    this.measurementsCount = config.measurementsCount;
    this.intervalMs = config.intervalMs;
    this.minRms = config.minRms;
    if (this.phase === 'idle' && countChanged) {
      this.tickStates = emptyTicks(config.measurementsCount);
      this.collectedCount = 0;
    }
    this.rebuild();
  }

  beginOfflineAnalysis(sampleId: string, measurementsCount: number): void {
    this.analysisStatus = 'loading';
    this.analyzedSampleId = sampleId;
    this.errorMessage = null;
    this.phase = 'collecting';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(measurementsCount);
    this.measurementsCount = measurementsCount;
    this.currentSample = null;
    this.lastResult = null;
    this.lastReport = null;
    this.rebuild();
  }

  finishOfflineAnalysis(
    sampleId: string,
    report: TrendsFftReport,
    result: TrendsDetectionResult,
    analysisParams: { measurementsCount: number; intervalMs: number },
  ): void {
    this.analysisStatus = 'ready';
    this.analyzedSampleId = sampleId;
    this.errorMessage = null;
    this.phase = 'result';
    this.lastReport = report;
    this.lastResult = result;
    this.resultAnalysisParams = { ...analysisParams };
    this.collectedCount = analysisParams.measurementsCount;
    this.tickStates = Array.from({ length: analysisParams.measurementsCount }, () => 'collected' as const);
    this.rebuild();
  }

  failOfflineAnalysis(message: string): void {
    this.analysisStatus = 'error';
    this.errorMessage = message;
    this.phase = 'idle';
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
    tickStates: TickState[];
    currentSample: TrendsFftSampleSnapshot['currentSample'];
  }): void {
    this.collectedCount = params.collectedCount;
    this.tickStates = params.tickStates;
    this.currentSample = params.currentSample;
    this.rebuild();
  }

  finishCollection(
    result: TrendsDetectionResult,
    analysisParams: { measurementsCount: number; intervalMs: number },
  ): void {
    this.phase = 'result';
    this.lastResult = result;
    this.resultAnalysisParams = { ...analysisParams };
    this.rebuild();
  }

  shouldRestartForParams(measurementsCount: number, intervalMs: number): boolean {
    if (this.phase !== 'result' || !this.resultAnalysisParams) return false;
    return (
      this.resultAnalysisParams.measurementsCount !== measurementsCount ||
      this.resultAnalysisParams.intervalMs !== intervalMs
    );
  }

  invalidateResult(measurementsCount: number): void {
    if (this.phase !== 'result') return;
    this.phase = 'idle';
    this.lastResult = null;
    this.resultAnalysisParams = null;
    this.collectedCount = 0;
    this.tickStates = emptyTicks(measurementsCount);
    this.currentSample = null;
    this.rebuild();
  }

  abortCollection(measurementsCount: number): void {
    this.phase = 'idle';
    this.collectedCount = 0;
    this.tickStates = emptyTicks(measurementsCount);
    this.currentSample = null;
    this.lastResult = null;
    this.resultAnalysisParams = null;
    this.rebuild();
  }

  reset(): void {
    this.ready = false;
    this.phase = 'idle';
    this.analysisStatus = 'idle';
    this.measurementsCount = 10;
    this.collectedCount = 0;
    this.tickStates = emptyTicks(10);
    this.currentSample = null;
    this.lastResult = null;
    this.lastReport = null;
    this.analyzedSampleId = null;
    this.errorMessage = null;
    this.resultAnalysisParams = null;
    this.intervalMs = 500;
    this.minRms = 0.02;
    this.selectedSampleId = null;
    this.selectedSampleTitle = null;
    this.durationPlan = null;
    this.blockedReason = null;
    this.rebuild();
  }

  private buildSnapshot(): TrendsFftSampleSnapshot {
    return {
      ready: this.ready,
      phase: this.phase,
      analysisStatus: this.analysisStatus,
      measurementsCount: this.measurementsCount,
      collectedCount: this.collectedCount,
      tickStates: this.tickStates,
      currentSample: this.currentSample,
      lastResult: this.lastResult,
      lastReport: this.lastReport,
      analyzedSampleId: this.analyzedSampleId,
      errorMessage: this.errorMessage,
      intervalMs: this.intervalMs,
      minRms: this.minRms,
      selectedSampleId: this.selectedSampleId,
      selectedSampleTitle: this.selectedSampleTitle,
      durationPlan: this.durationPlan,
      blockedReason: this.blockedReason,
    };
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}

export const trendsFftSamplePluginState = new TrendsFftSamplePluginStateImpl();

type SampleController = {
  analyzeSelectedSample: () => void;
};

let controller: SampleController | null = null;

export function registerTrendsFftSampleController(next: SampleController | null): void {
  controller = next;
}

export function requestTrendsSampleAnalysis(): void {
  controller?.analyzeSelectedSample();
}
