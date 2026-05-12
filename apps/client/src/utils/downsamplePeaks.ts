/**
 * Сжимает сэмплы до огибающей пиков для превью волны (чистая функция).
 */
export function downsampleToPeaks(
  channelData: Float32Array,
  targetBins: number
): Float32Array {
  if (targetBins <= 0) return new Float32Array();
  const len = channelData.length;
  if (len === 0) return new Float32Array(targetBins);
  const block = Math.max(1, Math.floor(len / targetBins));
  const out = new Float32Array(targetBins);
  for (let i = 0; i < targetBins; i++) {
    const start = i * block;
    const end = Math.min(len, start + block);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(channelData[j] ?? 0);
      if (v > peak) peak = v;
    }
    out[i] = peak;
  }
  return out;
}
