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
 * Громкость кадра для live-микрофона: max(RMS, peak×k).
 * Офисный фон даёт низкий RMS при заметных пиках — blend чувствительнее к реальной сцене.
 */
export function frameLoudness(samples: Float32Array, peakWeight = 0.45): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    sumSquares += s * s;
    const a = Math.abs(s);
    if (a > peak) peak = a;
  }
  const rmsVal = Math.sqrt(sumSquares / samples.length);
  return Math.max(rmsVal, peak * peakWeight);
}

/** Как в three-param-analyzer: спектр 0…255, L2-норма / 10 → типично 0.2…1.5. */
export const SPECTRAL_FLUX_BYTE_SCALE = 255;
export const SPECTRAL_FLUX_L2_DIVISOR = 10;

/**
 * L2 spectral flux между двумя спектрами (масштаб byte + делитель как в демо).
 * Pure-функция для тестов и кастомных трекеров.
 */
export function spectralFluxL2(
  current: Float32Array,
  previous: Float32Array,
): number {
  const scale = SPECTRAL_FLUX_BYTE_SCALE;
  let sumSq = 0;
  for (let i = 0; i < current.length; i++) {
    const diff = current[i]! * scale - previous[i]! * scale;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / current.length) / SPECTRAL_FLUX_L2_DIVISOR;
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
    this.previous = new Float32Array(current);

    if (prev === null || prev.length !== current.length) {
      return 0;
    }

    return spectralFluxL2(current, prev);
  }

  /** Сбрасывает состояние — нужно при начале нового анализа. */
  reset(): void {
    this.previous = null;
  }
}

/**
 * Верхняя граница «низкой» полосы дрона — в ГЕРЦАХ, не в долях спектра.
 *
 * 2400 Гц подобраны так, чтобы на каноническом 48 kHz результат совпал с прежней
 * «нижней 1/10» бит в бит: `2 × 2400 / 48000 = 0.1` при любом fftSize.
 */
export const LOW_BAND_MAX_HZ = 2400;

/** Частота, под которую калиброван эшелон 0 — умолчание старой сигнатуры. */
const CALIBRATION_SAMPLE_RATE = 48_000;

/**
 * Процент энергии в низкой полосе (0…{@link LOW_BAND_MAX_HZ}).
 *
 * Раньше полоса задавалась долей БИНОВ («нижняя 1/10») и потому означала
 * 0–2400 Гц на 48 kHz, но 0–800 Гц на 16 kHz. Порог `LOW_BAND_TARGET_PERCENT`
 * калиброван под первую полосу — значит на 16 kHz та же константа задавала
 * ДРУГОЙ физический вопрос: не деградация метрики, а подмена признака.
 * Пересчёт из герц делает вопрос одинаковым на любой частоте.
 *
 * На 48 kHz поведение НЕ меняется (см. подбор константы) — правка безопасна для
 * калибровки эшелона 0 и полезна сама по себе, вне интеграции внешних корпусов.
 */
export function lowEnergyPercent(
  magnitudes: Float32Array,
  sampleRate: number = CALIBRATION_SAMPLE_RATE,
): number {
  // magnitudes — половина спектра (fftSize/2), поэтому полосу в бины переводит
  // отношение 2·Гц/sampleRate, а не Гц/sampleRate.
  const bandFraction = (2 * LOW_BAND_MAX_HZ) / sampleRate;
  const lowBands = Math.max(1, Math.floor(magnitudes.length * bandFraction));
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
