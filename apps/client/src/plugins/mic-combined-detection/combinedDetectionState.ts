/**
 * Singleton-состояние combined-продюсера "mic-combined-detection" — мост между
 * plugin.install() (гоняет ансамбль на кадрах движка) и UI, а также источник
 * combinedScore для плагина-потребителя "mic-proximity-alarm" (alarm-loop).
 *
 * По контракту lifecycle (как micProximityPluginState): вся математика живёт в
 * install(); UI читает snapshot через useSyncExternalStore. Никакого Web Audio в UI.
 */

/** Вклад одного детектора в combinedScore (для объяснимости в UI). */
export interface CombinedDetectionSource {
  readonly name: string;
  readonly family: string;
  readonly confidence: number;
  readonly present: boolean;
}

export interface CombinedDetectionSnapshot {
  readonly live: boolean;
  /** Взвешенное среднее сырого confidence детекторов, [0..1]. */
  readonly combinedScore: number;
  /** combinedScore после EMA-сглаживания во времени. */
  readonly smoothedScore: number;
  /** Согласованность детекторов, [0..1] (1 — совпадают, 0 — максимальный разброс). */
  readonly agreement: number;
  /** Число отработавших (присутствующих) детекторов. */
  readonly presentCount: number;
  /** Разложение по источникам. */
  readonly perSource: readonly CombinedDetectionSource[];
}

export const initialCombinedDetectionSnapshot: CombinedDetectionSnapshot = {
  live: false,
  combinedScore: 0,
  smoothedScore: 0,
  agreement: 1,
  presentCount: 0,
  perSource: [],
};

class CombinedDetectionStateImpl {
  private snapshot: CombinedDetectionSnapshot = initialCombinedDetectionSnapshot;
  private listeners = new Set<() => void>();

  getSnapshot = (): CombinedDetectionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setLive(live: boolean): void {
    if (this.snapshot.live === live) return;
    this.patch({ live });
  }

  setReading(reading: {
    combinedScore: number;
    smoothedScore: number;
    agreement: number;
    presentCount: number;
    perSource: readonly CombinedDetectionSource[];
  }): void {
    this.patch(reading);
  }

  reset(): void {
    this.snapshot = initialCombinedDetectionSnapshot;
    this.emit();
  }

  private patch(part: Partial<CombinedDetectionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...part };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const combinedDetectionState = new CombinedDetectionStateImpl();
