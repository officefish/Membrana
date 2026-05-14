/**
 * Singleton-состояние плагина "microphone-stream-viz".
 *
 * Зачем нужно: чтобы подписка на `microphoneStreamHub` и поднятие `LiveSampler`
 * жили в `plugin.install()` (по новому контракту lifecycle), а UI-компонент
 * только читал готовое состояние через `useSyncExternalStore`.
 *
 * Без singleton'а пришлось бы тащить и подписку, и Web Audio в UI-хук — что
 * нарушает разделение «engine/lifecycle vs presentation», описанное в
 * `docs/MODULE_AND_PLUGIN_UI.md` §0 и `docs/ARCHITECTURE.md` §1c.
 */

const WF_LEN = 200;
const SPEC_BARS = 32;

export const initialMicStreamMetrics = {
  volume: 0,
  qualityScore: 0,
  snr: 0,
  noise: 0,
  waveformData: Array.from({ length: WF_LEN }, () => 0),
  spectrumData: Array.from({ length: SPEC_BARS }, () => 0),
};

export type MicStreamMetrics = typeof initialMicStreamMetrics;

export interface MicStreamSnapshot {
  readonly live: boolean;
  readonly metrics: MicStreamMetrics;
  /** Стабильный «ref-like» объект для виджетов audio-data-viz. */
  readonly analyserRef: { current: AnalyserNode | null };
}

class MicStreamPluginStateImpl {
  private analyserHolder: { current: AnalyserNode | null } = { current: null };
  private metrics: MicStreamMetrics = initialMicStreamMetrics;
  private live = false;
  private listeners = new Set<() => void>();
  private snapshotCache: MicStreamSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  // ============= Read API (для UI) =============

  /**
   * Стабильный snapshot. useSyncExternalStore сравнивает по `Object.is`,
   * поэтому объект пересоздаётся ТОЛЬКО при реальных изменениях.
   */
  getSnapshot = (): MicStreamSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // ============= Write API (для plugin.install) =============

  setMetrics(metrics: MicStreamMetrics): void {
    this.metrics = metrics;
    this.rebuild();
  }

  setLive(live: boolean): void {
    if (this.live === live) return;
    this.live = live;
    this.rebuild();
  }

  /** Обновляет .current внутри стабильного holder'а, не пересоздавая его. */
  setAnalyserNode(node: AnalyserNode | null): void {
    if (this.analyserHolder.current === node) return;
    this.analyserHolder.current = node;
    this.rebuild();
  }

  reset(): void {
    this.metrics = initialMicStreamMetrics;
    this.live = false;
    this.analyserHolder.current = null;
    this.rebuild();
  }

  // ============= Внутреннее =============

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): MicStreamSnapshot {
    return {
      live: this.live,
      metrics: this.metrics,
      analyserRef: this.analyserHolder,
    };
  }
}

export const micStreamPluginState = new MicStreamPluginStateImpl();

export const MIC_WAVEFORM_LEN = WF_LEN;
export const MIC_SPECTRUM_BARS = SPEC_BARS;
