/**
 * Подготовка окна и обход кадров — ОДИН носитель на все детекторы.
 *
 * ЗАЧЕМ ЗДЕСЬ, А НЕ В КАЖДОМ ПАКЕТЕ. До 02.08 обход кадров жил в дереве в ЧЕТЫРЁХ копиях:
 * приватная `iterWindows` этого же пакета (`analyze-sample.ts`) и по одной у гармонического,
 * кепстрального и flux-детекторов. Тела совпадали до символа, и разъезжались они молча:
 * дефект «детектор слышит первые `fftSize` сэмплов вместо записи» чинился 01.08 в одном
 * пакете и оставался в двух других до следующего дня.
 *
 * Носитель выбран не «новый общий модуль», а этот пакет: все три детектора уже зависят от
 * `@membrana/detector-base`, и здесь же живёт `analyzeSample` — внешняя рамка, которая режет
 * запись на кадры для бенчмарка и UI. Новых рёбер графа свод не заводит.
 *
 * СВОДОВ ДВА, И ЭТО НЕ ДУБЛИРОВАНИЕ. Как свести спектры кадров в один — вопрос природы
 * детектора, а не вкуса:
 *
 * - `averageMagnitudes` — арифметическое среднее. Годится там, где мерка линейна по спектру:
 *   гармоническому детектору и доле энергии низа.
 * - `geometricMeanMagnitudes` — среднее геометрическое. Обязательно для кепстра: кепстр есть
 *   `IFFT(log|S|)`, а `log` среднего не равен среднему логарифмов. Арифметика расплывает узкие
 *   гармоники под логарифмом, пик квефренции теряет амплитуду и `peakRatio` уходит под порог.
 *   Среднее геометрическое тождественно усреднению кепстров кадров (`IFFT` линеен, среднее
 *   логарифмов есть логарифм среднего геометрического).
 * - Детектору спектрального ПОТОКА любое усреднение спектров запрещено предметом: он мерит
 *   разницу между соседними кадрами, и усреднение стёрло бы измеряемое. Он берёт отсюда
 *   `fftFrames` и подаёт кадры в трекер по одному.
 *
 * Свести эти три ответа в один значило бы починить дублирование ценой правильности.
 *
 * ИНВАРИАНТ РОСТА (слово архитектора 02.08): **новый свод заводится только под новую ПРИРОДУ
 * детектора и только с обоснованием здесь же в шапке.** Свод — не «стратегия усреднения по
 * вкусу», а ответ на вопрос, линеен ли классификатор по спектру под своей внутренней
 * трансформацией; ответов конечное число. Свод без названной природы — отказ на ревью.
 *
 * ГРАНИЦА ЧИСТОТЫ (там же): этот файл остаётся без импортов FFT, окон Ханна и Web Audio —
 * собственно DSP живёт в `@membrana/fft-analyzer-service` и приходит сюда инъекцией
 * `magnitudesOf`. Как только сюда попросится сам БПФ — это сигнал, что механике место в
 * другом пакете, а не повод расширить этот.
 */

/** Дополнить короткий буфер нулями до длины `fftSize`. Длинный вход сюда не приходит. */
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
 * Кадры длиной ровно `fftSize` с перекрытием.
 *
 * Хвост короче кадра НЕ добивается нулями: дополненный хвост внёс бы в счёт спектр, которого в
 * записи нет, — а для потока это дало бы ложный скачок на последнем шаге. Цена названа, а не
 * умолчана: теряется до `hop − 1` сэмплов, при окне 2048 и шаге 1024 на 48 кГц это до 21 мс.
 *
 * @param hop шаг; по умолчанию половина окна — обычное перекрытие 50%.
 */
export function* fftFrames(
  samples: Float32Array,
  fftSize: number,
  hop: number = Math.max(1, Math.floor(fftSize / 2)),
): Generator<Float32Array> {
  // Нулевой или отрицательный шаг — ОШИБКА ВХОДА, и она называется вслух. Дефект найден
  // Дыниным на разборе 02.08 и старше свода: он одинаково жил во всех четырёх копиях. Путь
  // `analyzeSample` берёт шаг как `options.hopSize ?? Math.max(1, …)`, и нулевой `hopSize`
  // проходит мимо защиты, потому что `??` пропускает ноль. Дальше цикл выдаёт ОДИН И ТОТ ЖЕ
  // кадр бесконечно — проверено: 1001 итерация без продвижения.
  //
  // Молча вернуть пустоту нельзя: «кадров нет» и «шаг задан неверно» — разные факты, и первый
  // читался бы как «запись короче окна».
  if (!Number.isFinite(hop) || hop < 1) {
    throw new RangeError(`fftFrames: шаг ${hop} меньше одного сэмпла — обход не продвигается`);
  }
  if (samples.length < fftSize) return;
  for (let start = 0; start + fftSize <= samples.length; start += hop) {
    yield samples.subarray(start, start + fftSize);
  }
}

/**
 * Арифметическое среднее спектров кадров.
 *
 * Почему среднее по кадрам, а не один кадр: запись длиннее окна содержит не одно мгновение, и
 * судить её первым кадром значит судить не о ней. Почему среднее спектров, а не голосование
 * вердиктов: вердикты по кадрам собирает `analyzeSample`, и вторая его копия внутри детектора
 * была бы двумя источниками истины об одном.
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

/** Пол логарифма — тот же, что в кепстральном преобразовании: ноль под `log` не уходит в −∞. */
const LOG_EPS = 1e-10;

/**
 * Среднее геометрическое спектров кадров — свод, годный КЕПСТРУ.
 *
 * Логарифм результата равен среднему логарифмов поэлементно, поэтому подача сюда в
 * классификатор, берущий `log` внутри, тождественна усреднению кепстров кадров. Неравенство о
 * средних гарантирует, что результат не превосходит арифметического: пик не раздувается.
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
    if (magnitudes.length !== acc.length) continue;
    for (let i = 0; i < acc.length; i += 1) {
      acc[i] = (acc[i] ?? 0) + Math.log((magnitudes[i] ?? 0) + LOG_EPS);
    }
    count += 1;
  }

  if (logSum === null || count === 0) return null;
  const out = new Float32Array(logSum.length);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.exp((logSum[i] ?? 0) / count);
  return out;
}
