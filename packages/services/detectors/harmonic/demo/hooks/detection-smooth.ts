/** Сглаживание live-детекции: EMA confidence + гистерезис + подтверждение по кадрам. */

export interface DetectionSmoothingConfig {
  /** EMA для отображаемого confidence (0..1, выше = быстрее реакция). */
  readonly emaAlpha: number;
  /** Выше порога UI для включения «дрон» (гистерезис). */
  readonly hysteresisOn: number;
  /** Ниже порога UI для выключения «дрон». */
  readonly hysteresisOff: number;
  /** Подряд кадров выше on-порога → включить. */
  readonly framesToConfirmOn: number;
  /** Подряд кадров ниже off-порога → выключить. */
  readonly framesToConfirmOff: number;
}

export const DEFAULT_SMOOTHING_CONFIG: DetectionSmoothingConfig = {
  emaAlpha: 0.22,
  hysteresisOn: 0.06,
  hysteresisOff: 0.1,
  framesToConfirmOn: 3,
  framesToConfirmOff: 6,
};

export interface RawDetectionSample {
  readonly confidence: number;
  readonly isDrone: boolean;
  readonly reasoning?: string;
}

export interface SmoothedDetectionSample {
  readonly displayConfidence: number;
  readonly stableIsDrone: boolean;
  readonly displayReasoning?: string;
  readonly rawConfidence: number;
  readonly rawIsDrone: boolean;
}

export class DetectionSmoother {
  private displayConfidence = 0;
  private stableIsDrone = false;
  private displayReasoning: string | undefined;
  private onStreak = 0;
  private offStreak = 0;
  private initialized = false;

  reset(): void {
    this.displayConfidence = 0;
    this.stableIsDrone = false;
    this.displayReasoning = undefined;
    this.onStreak = 0;
    this.offStreak = 0;
    this.initialized = false;
  }

  update(
    raw: RawDetectionSample,
    threshold: number,
    config: DetectionSmoothingConfig = DEFAULT_SMOOTHING_CONFIG,
  ): SmoothedDetectionSample {
    if (!this.initialized) {
      this.displayConfidence = raw.confidence;
      this.initialized = true;
    } else {
      this.displayConfidence =
        config.emaAlpha * raw.confidence + (1 - config.emaAlpha) * this.displayConfidence;
    }

    const onLevel = threshold + config.hysteresisOn;
    const offLevel = Math.max(0, threshold - config.hysteresisOff);

    if (raw.confidence >= onLevel) {
      this.onStreak += 1;
      this.offStreak = 0;
    } else if (raw.confidence < offLevel) {
      this.offStreak += 1;
      this.onStreak = 0;
    }

    const prevStable = this.stableIsDrone;
    if (!this.stableIsDrone && this.onStreak >= config.framesToConfirmOn) {
      this.stableIsDrone = true;
    } else if (this.stableIsDrone && this.offStreak >= config.framesToConfirmOff) {
      this.stableIsDrone = false;
    }

    if (this.stableIsDrone !== prevStable && raw.reasoning != null) {
      this.displayReasoning = raw.reasoning;
    } else if (this.displayReasoning == null && raw.reasoning != null) {
      this.displayReasoning = raw.reasoning;
    }

    return {
      displayConfidence: this.displayConfidence,
      stableIsDrone: this.stableIsDrone,
      displayReasoning: this.displayReasoning,
      rawConfidence: raw.confidence,
      rawIsDrone: raw.isDrone,
    };
  }
}
