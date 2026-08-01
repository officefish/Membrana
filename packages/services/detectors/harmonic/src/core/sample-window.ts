/**
 * Подготовка входа под БПФ.
 *
 * ДЕФЕКТ, ЗАКРЫТЫЙ 01.08. Прежде здесь была одна функция, и она молча обрезала вход до
 * первых `fftSize` сэмплов. При окне 4096 и частоте 48 кГц это 85 мс: детектор, которому
 * подали пятисекундную запись, судил по её первой сотой доле и об этом не сообщал.
 * Обход существовал снаружи — `analyzeSample` из `@membrana/detector-base` сам режет запись
 * на кадры, — поэтому бенчмарк был честен, а прямой вызов `detect()` нет.
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

/**
 * Усреднить спектры кадров записи в один.
 *
 * Почему среднее по кадрам, а не один кадр: запись длиннее окна содержит не одно
 * мгновение, и судить её первым кадром значит судить не о ней. Почему среднее спектров,
 * а не голосование вердиктов: вердикты по кадрам умеет собирать `analyzeSample`, и вторая
 * его копия внутри детектора была бы двумя источниками истины об одном.
 *
 * @param magnitudesOf счёт спектра одного кадра — инъекция, чтобы функция осталась чистой
 * @returns усреднённый спектр либо `null`, если кадров нет вовсе
 */
export function averageMagnitudes(
  samples: Float32Array,
  fftSize: number,
  magnitudesOf: (frame: Float32Array) => Float32Array,
  hop?: number,
): Float32Array | null {
  let sum: Float32Array | null = null;
  let count = 0;

  for (const frame of fftFrames(samples, fftSize, hop)) {
    const magnitudes = magnitudesOf(frame);
    if (sum === null) sum = new Float32Array(magnitudes.length);
    const acc = sum;
    // Кадр с иной длиной спектра пропускается, а не подгоняется: сложить спектры разных
    // разрешений значило бы получить число, не относящееся ни к одному из них.
    if (magnitudes.length !== acc.length) continue;
    for (let i = 0; i < acc.length; i += 1) acc[i] = (acc[i] ?? 0) + (magnitudes[i] ?? 0);
    count += 1;
  }

  if (sum === null || count === 0) return null;
  const averaged = sum;
  for (let i = 0; i < averaged.length; i += 1) averaged[i] = (averaged[i] ?? 0) / count;
  return averaged;
}
