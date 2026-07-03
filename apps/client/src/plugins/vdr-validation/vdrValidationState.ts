import { useSyncExternalStore } from 'react';

import type { VdrCorpusRow, VdrGateMetrics, VdrLiveVerdict, VdrManifestSample } from './types';
import { computeVdrGateMetrics } from './vdrMetrics';

export interface VdrValidationSnapshot {
  readonly manifestName: string | null;
  readonly manifestSamples: readonly VdrManifestSample[];
  readonly rows: readonly VdrCorpusRow[];
  readonly metrics: VdrGateMetrics | null;
  readonly running: boolean;
  readonly progressDone: number;
  readonly progressTotal: number;
  readonly error: string | null;
  readonly liveCollecting: boolean;
  readonly liveVerdict: VdrLiveVerdict | null;
}

const initialSnapshot: VdrValidationSnapshot = {
  manifestName: null,
  manifestSamples: [],
  rows: [],
  metrics: null,
  running: false,
  progressDone: 0,
  progressTotal: 0,
  error: null,
  liveCollecting: false,
  liveVerdict: null,
};

/** Singleton-state плагина (паттерн micLiveDronePluginState: install() + панель через useSyncExternalStore). */
class VdrValidationState {
  private snapshot: VdrValidationSnapshot = initialSnapshot;

  private readonly listeners = new Set<() => void>();

  getSnapshot = (): VdrValidationSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private patch(next: Partial<VdrValidationSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }

  setManifest(name: string, samples: readonly VdrManifestSample[]): void {
    this.patch({
      manifestName: name,
      manifestSamples: samples,
      rows: [],
      metrics: null,
      error: null,
    });
  }

  beginRun(total: number): void {
    this.patch({ running: true, rows: [], metrics: null, progressDone: 0, progressTotal: total, error: null });
  }

  pushRow(row: VdrCorpusRow): void {
    const rows = [...this.snapshot.rows, row];
    this.patch({ rows, progressDone: rows.length });
  }

  finishRun(): void {
    this.patch({ running: false, metrics: computeVdrGateMetrics(this.snapshot.rows) });
  }

  failRun(message: string): void {
    this.patch({ running: false, error: message });
  }

  setLiveCollecting(collecting: boolean): void {
    this.patch({ liveCollecting: collecting });
  }

  setLiveVerdict(verdict: VdrLiveVerdict | null): void {
    this.patch({ liveCollecting: false, liveVerdict: verdict });
  }

  reset(): void {
    this.snapshot = initialSnapshot;
    for (const listener of this.listeners) listener();
  }
}

export const vdrValidationState = new VdrValidationState();

export function useVdrValidationSnapshot(): VdrValidationSnapshot {
  return useSyncExternalStore(vdrValidationState.subscribe, vdrValidationState.getSnapshot);
}

/** Controller живого окна: реализует плагин в install(), панель дергает кнопкой. */
export interface VdrLiveController {
  readonly startLiveWindow: () => void;
}

let liveController: VdrLiveController | null = null;

export function registerVdrLiveController(controller: VdrLiveController | null): void {
  liveController = controller;
}

export function getVdrLiveController(): VdrLiveController | null {
  return liveController;
}
