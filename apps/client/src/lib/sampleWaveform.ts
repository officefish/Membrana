/** Peak envelope для осциллограммы (нормализованные амплитуды 0…1). */
export function computePeakEnvelope(
  samples: Float32Array,
  pointCount: number,
): number[] {
  if (samples.length === 0 || pointCount <= 0) {
    return [];
  }

  const blockSize = Math.max(1, Math.floor(samples.length / pointCount));
  const peaks: number[] = [];

  for (let i = 0; i < pointCount; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, samples.length);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const amp = Math.abs(samples[j] ?? 0);
      if (amp > peak) peak = amp;
    }
    peaks.push(peak);
  }

  const max = Math.max(...peaks, 1e-6);
  return peaks.map((p) => p / max);
}

export function ratioToOffsetSec(ratio: number, durationSec: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  return clamped * Math.max(0, durationSec);
}

export function formatPlaybackTime(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
