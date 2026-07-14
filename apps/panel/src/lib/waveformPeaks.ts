/**
 * Mini-waveform борда detector-compare: downsample по max-|amplitude| на бакет.
 *
 * Именно максимум, НЕ среднее (вердикт консилиума detector-compare-board):
 * усреднение размазывает импульсные звуки (выстрел «gunshot») в шум —
 * оператор должен видеть честные пики того, что слышал детектор.
 */
export function downsamplePeaks(samples: ArrayLike<number>, buckets: number): Float32Array {
  const out = new Float32Array(Math.max(0, buckets));
  const n = samples.length;
  if (n === 0 || buckets <= 0) return out;
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor((b * n) / buckets);
    const end = Math.max(start + 1, Math.floor(((b + 1) * n) / buckets));
    let peak = 0;
    for (let i = start; i < end && i < n; i++) {
      const a = Math.abs(samples[i] ?? 0);
      if (a > peak) peak = a;
    }
    out[b] = peak;
  }
  return out;
}
