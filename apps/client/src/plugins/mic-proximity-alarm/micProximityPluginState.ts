/**
 * Singleton-состояние плагина "mic-proximity-alarm" (alarm-loop «ближе/дальше»).
 *
 * По контракту lifecycle (как microphone-stream-viz): подписка на кадры движка и
 * трекер тренда живут в plugin.install(); UI-компонент читает готовый snapshot
 * через useSyncExternalStore. Никакого Web Audio в UI.
 */

import type { LoudnessTrend, ProximityAlarmResult } from '@membrana/fft-analyzer-service';

export interface MicProximitySnapshot {
  readonly live: boolean;
  /** Направление громкости: приближается / удаляется / стабильно. */
  readonly trend: LoudnessTrend;
  /** Последняя громкость кадра (грубая амплитуда сцены, не координата). */
  readonly loudness: number;
  /** Накоплено ли окно тренда. */
  readonly ready: boolean;
  /** combinedScore из fusion-ядра A. 0, пока нет combined-продюсера (каркас E). */
  readonly combinedScore: number;
  /** Есть ли живой источник combinedScore (combined-плагин). */
  readonly hasCombinedSource: boolean;
  /** Результат гейта тревоги по combinedScore. */
  readonly alarm: ProximityAlarmResult;
}

const INITIAL_ALARM: ProximityAlarmResult = { active: false, rising: false, easing: false };

export const initialMicProximitySnapshot: MicProximitySnapshot = {
  live: false,
  trend: 'stable',
  loudness: 0,
  ready: false,
  combinedScore: 0,
  hasCombinedSource: false,
  alarm: INITIAL_ALARM,
};

class MicProximityPluginStateImpl {
  private snapshot: MicProximitySnapshot = initialMicProximitySnapshot;
  private listeners = new Set<() => void>();

  getSnapshot = (): MicProximitySnapshot => this.snapshot;

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

  /** Обновить измерение тренда/тревоги за кадр. */
  setReading(reading: {
    trend: LoudnessTrend;
    loudness: number;
    ready: boolean;
    combinedScore: number;
    hasCombinedSource: boolean;
    alarm: ProximityAlarmResult;
  }): void {
    this.patch(reading);
  }

  reset(): void {
    this.snapshot = initialMicProximitySnapshot;
    this.emit();
  }

  private patch(part: Partial<MicProximitySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...part };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const micProximityPluginState = new MicProximityPluginStateImpl();
