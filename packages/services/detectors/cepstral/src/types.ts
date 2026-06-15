export interface CepstralDetectorConfig {
  readonly fftSize: number;
  readonly sampleRate: number;
  readonly confidenceThreshold: number;
  readonly fundamentalMinHz: number;
  readonly fundamentalMaxHz: number;
}

export interface CepstralSpectrumResult {
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly reasoning: string;
  readonly fundamentalHz?: number;
  readonly peakRatio: number;
}
