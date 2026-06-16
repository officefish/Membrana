/** Raw FFT metric formatters for journal tables (mirror of the client UI lib). */

export function formatRawCentroid(hz: number): string {
  return `${Math.round(hz)} Гц`;
}

export function formatRawFlux(raw: number): string {
  return raw.toFixed(3);
}

export function formatRawLoudness(raw: number): string {
  return raw.toFixed(4);
}
