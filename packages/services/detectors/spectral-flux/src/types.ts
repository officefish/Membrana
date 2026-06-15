export interface SpectralFluxDetectorConfig {
  readonly fftSize: number;
  readonly sampleRate: number;
  readonly confidenceThreshold: number;
  readonly lowBandTargetPercent: number;
}

export interface SpectralFluxSpectrumResult {
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly reasoning: string;
}
