/**
 * Подготовка входа под БПФ.
 *
 * ДЕФЕКТ, ЗАКРЫТЫЙ 02.08 — тот же, что в гармоническом детекторе закрыт 01.08. Прежде здесь
 * была одна функция, и она молча обрезала вход до первых `fftSize` сэмплов. При окне 2048 и
 * частоте 48 кГц это 43 мс: детектор, которому подали пятисекундную запись, судил по её первой
 * сотой доле и об этом не сообщал. Обход существовал снаружи — `analyzeSample` из
 * `@membrana/detector-base` сам режет запись на кадры, — поэтому бенчмарк был честен, а прямой
 * вызов `detect()` нет.
 *
 * Копия механики, а не общий модуль: свод трёх копий к одной серии трогает РАБОТАЮЩИЙ
 * FFT-детектор и идёт отдельным спринтом (#1572). Размножать лечение по копиям, пока копии
 * живы, — меньшая цена, чем оставить два детектора из трёх глухими.
 *
 * Короткий вход по-прежнему дополняется нулями: это не потеря, а известная плата за окно.
 */

/** Дополнить короткий буфер нулями до длины fftSize. Длинный вход сюда не приходит. */
export function prepareFftSamples(samples: Float32Array, fftSize: number): Float32Array {
  if (samples.length === fftSize) {
    return samples;
  }
  const out = new Float32Array(fftSize);
  const copyLen = Math.min(samples.length, fftSize);
  out.set(samples.subarray(0, copyLen));
  return out;
}

/**
 * Кадры длиной ровно `fftSize` с перекрытием. Хвост короче кадра НЕ добивается нулями:
 * дополненный хвост внёс бы в среднее спектр, которого в записи нет.
 *
 * @param hop шаг; по умолчанию половина окна — обычное перекрытие 50%.
 */
export function* fftFrames(
  samples: Float32Array,
  fftSize: number,
  hop: number = Math.max(1, Math.floor(fftSize / 2)),
): Generator<Float32Array> {
  if (samples.length < fftSize) return;
  for (let start = 0; start + fftSize <= samples.length; start += hop) {
    yield samples.subarray(start, start + fftSize);
  }
}

/** Пол логарифма — тот же, что в `magnitudesToRealCepstrum`: ноль под `log` не уходит в −∞. */
const LOG_EPS = 1e-10;

/**
 * Свести спектры кадров записи в ОДИН спектр, годный кепстру.
 *
 * ПОЧЕМУ НЕ АРИФМЕТИЧЕСКОЕ СРЕДНЕЕ, которым вылечен гармонический детектор. Кепстр есть
 * `IFFT(log|S|)`, и логарифм среднего не равен среднему логарифмов: `log((a+b)/2) ≥` … нет,
 * строго — для `a ≠ b` выполняется `log((a+b)/2) > (log a + log b)/2`, и разница тем больше,
 * чем острее пик. Практическое следствие названо Дыниным на разборе блока: узкие гармоники
 * дрона, спущенные под логарифм ПОСЛЕ арифметического усреднения, расплываются, пик
 * квефренции теряет амплитуду, и `peakRatio` падает — запись с пограничным соотношением
 * уходит под порог. Ось квефренции при этом не смещается: портится маржа, а не адрес.
 *
 * ПОЧЕМУ СРЕДНЕЕ ГЕОМЕТРИЧЕСКОЕ РЕШАЕТ ЭТО ЦЕЛИКОМ. Правильная свёртка для кепстра —
 * усреднить КЕПСТРЫ кадров. `IFFT` линейно, значит среднее кепстров равно `IFFT` от среднего
 * логарифмов спектров, а среднее логарифмов есть логарифм среднего геометрического. Подав
 * геометрическое среднее в существующий `classifyCepstrum`, мы получаем в точности усреднение
 * кепстров — без второй копии классификатора внутри детектора.
 *
 * Соседнему flux-детектору любое усреднение спектров запрещено предметом: он мерит разницу
 * между кадрами, и усреднение стёрло бы измеряемое.
 *
 * @param magnitudesOf счёт спектра одного кадра — инъекция, чтобы функция осталась чистой
 * @returns сведённый спектр либо `null`, если кадров нет вовсе
 */
export function geometricMeanMagnitudes(
  samples: Float32Array,
  fftSize: number,
  magnitudesOf: (frame: Float32Array) => Float32Array,
  hop?: number,
): Float32Array | null {
  let logSum: Float64Array | null = null;
  let count = 0;

  for (const frame of fftFrames(samples, fftSize, hop)) {
    const magnitudes = magnitudesOf(frame);
    if (logSum === null) logSum = new Float64Array(magnitudes.length);
    const acc = logSum;
    // Кадр с иной длиной спектра пропускается, а не подгоняется: сложить спектры разных
    // разрешений значило бы получить число, не относящееся ни к одному из них.
    if (magnitudes.length !== acc.length) continue;
    for (let i = 0; i < acc.length; i += 1) acc[i] = (acc[i] ?? 0) + Math.log((magnitudes[i] ?? 0) + LOG_EPS);
    count += 1;
  }

  if (logSum === null || count === 0) return null;
  const out = new Float32Array(logSum.length);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.exp((logSum[i] ?? 0) / count);
  return out;
}
