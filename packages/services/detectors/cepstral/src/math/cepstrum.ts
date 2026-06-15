const LOG_EPS = 1e-10;

function fftInPlace(
  re: Float64Array,
  im: Float64Array,
  cos: Float64Array,
  sin: Float64Array,
): void {
  const n = re.length;

  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }

  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let i = 0; i < n; i += size) {
      for (let k = 0; k < half; k++) {
        const ti = k * step;
        const c = cos[ti]!;
        const s = sin[ti]!;
        const tRe = c * re[i + k + half]! - s * im[i + k + half]!;
        const tIm = c * im[i + k + half]! + s * re[i + k + half]!;
        re[i + k + half] = re[i + k]! - tRe;
        im[i + k + half] = im[i + k]! - tIm;
        re[i + k] = re[i + k]! + tRe;
        im[i + k] = im[i + k]! + tIm;
      }
    }
  }
}

function inverseFftInPlace(
  re: Float64Array,
  im: Float64Array,
  cos: Float64Array,
  sin: Float64Array,
): void {
  for (let i = 0; i < im.length; i++) {
    im[i] = -im[i]!;
  }
  fftInPlace(re, im, cos, sin);
  const n = re.length;
  for (let i = 0; i < n; i++) {
    re[i] = re[i]! / n;
    im[i] = -im[i]! / n;
  }
}

function buildTwiddles(size: number): { cos: Float64Array; sin: Float64Array } {
  const halfN = size / 2;
  const cos = new Float64Array(halfN);
  const sin = new Float64Array(halfN);
  for (let i = 0; i < halfN; i++) {
    const phase = (-2 * Math.PI * i) / size;
    cos[i] = Math.cos(phase);
    sin[i] = Math.sin(phase);
  }
  return { cos, sin };
}

/**
 * Real cepstrum from linear magnitude spectrum (log-magnitude, zero phase, IFFT).
 */
export function magnitudesToRealCepstrum(
  magnitudes: Float32Array,
  fftSize: number,
): Float32Array {
  const n = fftSize;
  const half = n / 2;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const { cos, sin } = buildTwiddles(n);

  re[0] = Math.log(magnitudes[0]! + LOG_EPS);
  for (let k = 1; k < half; k++) {
    const logMag = Math.log(magnitudes[k]! + LOG_EPS);
    re[k] = logMag;
    re[n - k] = logMag;
  }
  re[half] = Math.log(magnitudes[half - 1]! + LOG_EPS);

  inverseFftInPlace(re, im, cos, sin);

  const cepstrum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    cepstrum[i] = Math.abs(re[i]!);
  }
  return cepstrum;
}
