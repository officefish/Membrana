/**
 * ND1 — подготовка волны для YAMNet: ресемпл в 16 кГц моно + паддинг до минимума модели.
 *
 * Линейная интерполяция достаточна: полезный сигнал дрона лежит ниже 8 кГц (Найквист 16k),
 * а YAMNet сам считает mel-спектрограмму — прецизионный полифазный ресемплер здесь не нужен.
 */

/** Частота дискретизации, которую ожидает YAMNet. */
export const YAMNET_SAMPLE_RATE = 16_000;

/** Минимальная длина волны (0.975 с — один анализный фрейм YAMNet). */
export const YAMNET_MIN_WAVEFORM_LENGTH = 15_600;

/** Линейный ресемпл `samples` из `fromRate` в `toRate`. Возвращает исходник, если частоты равны. */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return samples;
  if (samples.length === 0) return new Float32Array(0);
  const outLength = Math.max(1, Math.round((samples.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  // Шаг — точное отношение частот (одна временная сетка), НЕ растяжение по краям:
  // endpoint-нормировка (len-1)/(outLen-1) накапливает фазовый дрейф по клипу.
  const step = fromRate / toRate;
  const last = samples.length - 1;
  for (let i = 0; i < outLength; i++) {
    const pos = Math.min(i * step, last);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, last);
    const frac = pos - lo;
    out[i] = samples[lo]! * (1 - frac) + samples[hi]! * frac;
  }
  return out;
}

/** Дополняет волну нулями справа до минимальной длины фрейма YAMNet. */
export function padToMinLength(
  samples: Float32Array,
  minLength = YAMNET_MIN_WAVEFORM_LENGTH,
): Float32Array {
  if (samples.length >= minLength) return samples;
  const out = new Float32Array(minLength);
  out.set(samples);
  return out;
}

/** Полная подготовка окна: ресемпл в 16 кГц + паддинг до минимума. */
export function prepareWaveform(samples: Float32Array, sampleRate: number): Float32Array {
  return padToMinLength(resampleLinear(samples, sampleRate, YAMNET_SAMPLE_RATE));
}
