/**
 * Чистые функции вычисления аудио-метрик.
 *
 * Все функции — pure. Никакого состояния, никаких side-effects, никаких
 * зависимостей от React / DOM / Web Audio. Любой кусок логики, который
 * нуждается в состоянии (например, flux требует предыдущий кадр), оформлен
 * как класс или принимает предыдущее состояние явным параметром.
 */

/**
 * Спектральный центроид: «центр тяжести» спектра в Гц.
 * Σ(f_i * mag_i) / Σ(mag_i).
 */
export function spectralCentroid(
  magnitudes: Float32Array,
  frequencies: Float32Array,
): number {
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    const m = magnitudes[i]!;
    numerator += frequencies[i]! * m;
    denominator += m;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

/** RMS амплитуда временного буфера. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    sumSquares += s * s;
  }
  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Спектральный flux — мера изменения спектра между двумя кадрами.
 * Stateful по природе, поэтому оформлен классом — хранит предыдущий спектр.
 */
export class SpectralFluxTracker {
  private previous: Float32Array | null = null;

  /** Считает flux относительно предыдущего вызова. Первый вызов возвращает 0. */
  next(current: Float32Array): number {
    const prev = this.previous;
    this.previous = new Float32Array(current); // копия, чтобы дальнейшая мутация current не сломала state

    if (prev === null || prev.length !== current.length) {
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < current.length; i++) {
      const diff = current[i]! - prev[i]!;
      sum += diff * diff;
    }
    return Math.sqrt(sum) / current.length;
  }

  /** Сбрасывает состояние — нужно при начале нового анализа. */
  reset(): void {
    this.previous = null;
  }
}

/** Процент энергии в нижней 1/10 спектра. */
export function lowEnergyPercent(magnitudes: Float32Array): number {
  const lowBands = Math.max(1, Math.floor(magnitudes.length * 0.1));
  let low = 0;
  let total = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    const m = magnitudes[i]!;
    total += m;
    if (i < lowBands) low += m;
  }
  return total > 0 ? (low / total) * 100 : 0;
}

/** Грубая оценка стабильности от flux: 1 = стабильно, 0 = бурный сигнал. */
export function stabilityFromFlux(flux: number): number {
  return flux > 0 ? Math.max(0, 1 - flux / 2) : 1;
}

/**
 * Зануляет бины вне частотного диапазона.
 * Возвращает НОВЫЙ массив, исходный не мутирует.
 */
export function applyFrequencyFilter(
  magnitudes: Float32Array,
  frequencies: Float32Array,
  minFreq: number,
  maxFreq: number,
): Float32Array {
  const out = new Float32Array(magnitudes.length);
  for (let i = 0; i < magnitudes.length; i++) {
    const f = frequencies[i]!;
    if (f >= minFreq && f <= maxFreq) {
      out[i] = magnitudes[i]!;
    }
  }
  return out;
}

/** Zero-crossing rate — сколько раз сигнал пересёк ноль (нормировано на длину). */
export function zeroCrossingRate(samples: Float32Array): number {
  if (samples.length < 2) return 0;
  let crossings = 0;
  let prev = samples[0]!;
  for (let i = 1; i < samples.length; i++) {
    const cur = samples[i]!;
    if ((prev < 0 && cur >= 0) || (prev >= 0 && cur < 0)) {
      crossings++;
    }
    prev = cur;
  }
  return crossings / (samples.length - 1);
}

/**
 * Spectral rolloff: частота, ниже которой сосредоточено `percentile` энергии.
 * По умолчанию 85%.
 */
export function spectralRolloff(
  magnitudes: Float32Array,
  frequencies: Float32Array,
  percentile = 0.85,
): number {
  let total = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    total += magnitudes[i]!;
  }
  if (total === 0) return 0;

  const target = total * percentile;
  let cum = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    cum += magnitudes[i]!;
    if (cum >= target) {
      return frequencies[i]!;
    }
  }
  return frequencies[frequencies.length - 1] ?? 0;
}

/**
 * Spectral flatness (Wiener entropy): отношение геометрического среднего к
 * арифметическому. 1 = белый шум, 0 = тон.
 */
export function spectralFlatness(magnitudes: Float32Array): number {
  if (magnitudes.length === 0) return 0;
  let logSum = 0;
  let arith = 0;
  let nonZero = 0;
  const eps = 1e-12;

  for (let i = 0; i < magnitudes.length; i++) {
    const m = magnitudes[i]!;
    arith += m;
    if (m > eps) {
      logSum += Math.log(m);
      nonZero++;
    }
  }
  if (nonZero === 0 || arith === 0) return 0;

  const geo = Math.exp(logSum / nonZero);
  const ari = arith / magnitudes.length;
  return geo / ari;
}
