/** Ограничивает позицию воспроизведения в пределах длительности буфера. */
export function clampPlaybackOffset(offsetSec: number, durationSec: number): number {
  if (!Number.isFinite(offsetSec) || durationSec <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(durationSec, offsetSec));
}
