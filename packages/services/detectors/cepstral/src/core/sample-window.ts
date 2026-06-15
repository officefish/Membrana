/** Подготовить буфер длины fftSize (zero-pad или обрезка). */
export function prepareFftSamples(samples: Float32Array, fftSize: number): Float32Array {
  if (samples.length === fftSize) {
    return samples;
  }
  const out = new Float32Array(fftSize);
  const copyLen = Math.min(samples.length, fftSize);
  out.set(samples.subarray(0, copyLen));
  return out;
}
