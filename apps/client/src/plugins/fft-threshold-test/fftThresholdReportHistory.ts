import type { FftThresholdTestReport } from './buildFftThresholdTestReport';

const MAX_REPORTS = 5;

class FftThresholdReportHistoryImpl {
  private reports: FftThresholdTestReport[] = [];
  private readonly listeners = new Set<() => void>();

  getReports = (): readonly FftThresholdTestReport[] => this.reports;

  push(report: FftThresholdTestReport): void {
    this.reports = [report, ...this.reports].slice(0, MAX_REPORTS);
    this.notify();
  }

  clear(): void {
    this.reports = [];
    this.notify();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const fftThresholdReportHistory = new FftThresholdReportHistoryImpl();
