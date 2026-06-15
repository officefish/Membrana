/** Legacy RAM journal writes disabled — live journal epic TJ3. */
export function logMicSamplerStart(_moduleId: string): void {
  /* no-op */
}

export function logMicSamplerStop(_moduleId: string): void {
  /* no-op */
}

export function logMicSamplerError(_moduleId: string): void {
  /* no-op */
}

export function logMicMetricsAggregateThrottled(
  _moduleId: string,
  _metrics: {
    volume: number;
    qualityScore: number;
    snr: number;
    noise: number;
  },
): void {
  /* no-op */
}

export function clearMicTelemetryThrottle(_moduleId: string): void {
  /* no-op */
}
