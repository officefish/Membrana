/**
 * Подготовка входа под БПФ для детектора спектрального потока.
 *
 * ДЕФЕКТ, ЗАКРЫТЫЙ 02.08 — тот же, что в гармоническом закрыт 01.08, а в кепстральном тем же
 * днём, что и здесь. Прежде тут была одна функция, и она молча обрезала вход до первых
 * `fftSize` сэмплов. При окне 2048 и частоте 48 кГц это 43 мс: детектор, которому подали
 * пятисекундную запись, судил по её первой сотой доле и об этом не сообщал. Обход существовал
 * снаружи — `analyzeSample` из `@membrana/detector-base` сам режет запись на кадры, — поэтому
 * бенчмарк был честен, а прямой вызов `detect()` нет.
 *
 * ЛЕЧЕНИЕ ЗДЕСЬ ДРУГОЕ, И ЭТО ГЛАВНОЕ. Соседям запись сводится усреднением спектров кадров
 * (гармонический — арифметическим, кепстральный — геометрическим). Детектору ПОТОКА такой ход
 * запрещён предметом: он мерит разницу между соседними кадрами, и усреднение стёрло бы ровно
 * то, что он измеряет. Кадры отсюда уходят в трекер по одному — см. `spectral-flux-detector.ts`.
 *
 * Усреднение спектров всё же есть, но для другой величины: `lowEnergyPercent` — доля энергии
 * низа, мера линейная и к разнице кадров не относящаяся. Её честно считать по спектру записи,
 * а не по спектру её первых 43 мс.
 *
 * Копия механики, а не общий модуль: свод трёх копий к одной серии трогает РАБОТАЮЩИЙ
 * FFT-детектор и идёт отдельным спринтом (#1572).
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
 * дополненный хвост внёс бы в счёт спектр, которого в записи нет, — а для потока это дало бы
 * ложный скачок на последнем шаге.
 *
 * ЦЕНА НАЗВАНА, А НЕ УМОЛЧАНА: хвост длиной до `hop − 1` сэмплов в счёт не идёт вовсе. При
 * окне 2048, шаге 1024 и 48 кГц это до 21 мс — около 0.4% пятисекундной записи и одна
 * пропущенная разница кадров. Для источника, звучащего сотнями миллисекунд, это внутри шума;
 * важно, что предел известен и записан, а не обнаруживается по расхождению чисел.
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
 * Среднее спектров кадров — для линейных величин записи (`lowEnergyPercent`), не для потока.
 *
 * Арифметическое среднее здесь законно и правильно: доля низкочастотной энергии есть отношение
 * сумм, и среднее спектров даёт спектр записи в том же смысле, в каком его понимает эта мера.
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
