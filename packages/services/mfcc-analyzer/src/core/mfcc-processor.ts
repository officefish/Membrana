/**
 * Свёртка одного кадра в вектор коэффициентов. **Stateless по требованию структурщика:**
 * `(window, config) => MfccVector`, ничего не помнит между вызовами.
 *
 * Он же назвал самое вероятное место протечки — этот файл: если сюда попадёт логика окна
 * (хоп, размер кадра, накопление), получится «один король, два скипетра». Поэтому здесь нет
 * ни одного поля состояния, и это проверяется зубом, а не обещанием.
 */
import type { AudioWindow, MfccConfig, MfccExtractor, MfccResult } from '../types.js';

/**
 * Отпечаток настроек. Детерминирован и не зависит от порядка полей: два вектора с разными
 * отпечатками несравнимы, и метка должна быть воспроизводимой, а не случайной.
 */
export function configHashOf(config: MfccConfig): string {
  return `mel${config.melBands}-c${config.numberOfCoefficients}-buf${config.bufferSize}`;
}

/**
 * Проверка настроек ПЕРЕД свёрткой. Отказ — с причиной: молчаливая подстановка умолчаний
 * означала бы, что ядро выбрало числа за исполнителя, а числа под дрон подбираются, а не
 * назначаются.
 */
export function configProblem(config: MfccConfig): string | null {
  if (!Number.isInteger(config.melBands) || config.melBands < 1) {
    return `melBands=${String(config.melBands)} — не целое ≥ 1`;
  }
  if (!Number.isInteger(config.numberOfCoefficients) || config.numberOfCoefficients < 1) {
    return `numberOfCoefficients=${String(config.numberOfCoefficients)} — не целое ≥ 1`;
  }
  if (!Number.isInteger(config.bufferSize) || config.bufferSize < 2) {
    return `bufferSize=${String(config.bufferSize)} — не целое ≥ 2`;
  }
  if (config.numberOfCoefficients > config.melBands) {
    // Коэффициентов больше, чем фильтров, из которых они считаются — вход бессмысленный.
    // Ловим здесь, а не в библиотеке: её ответ на такой вход не определён контрактом.
    return `numberOfCoefficients=${config.numberOfCoefficients} > melBands=${config.melBands}`;
  }
  return null;
}

/**
 * Свернуть кадр. Библиотека приходит **параметром** (`extract`), а не импортом: тип шва
 * `MfccExtractor` — единственное, что ядро знает о внешнем мире.
 */
export function processWindow(
  window: AudioWindow,
  config: MfccConfig,
  extract: MfccExtractor,
): MfccResult {
  const problem = configProblem(config);
  if (problem !== null) return { ok: false, reason: `настройки негодны: ${problem}` };

  if (window.samples.length !== config.bufferSize) {
    // Кадр не той длины — это ошибка кадрирования снаружи, а не повод дополнить нулями:
    // дополнение исказило бы спектр и осталось бы невидимым в выходе.
    return {
      ok: false,
      reason: `длина кадра ${window.samples.length} ≠ bufferSize ${config.bufferSize}`,
    };
  }

  const raw = extract(window.samples, config);
  if (!Array.isArray(raw) || raw.length !== config.numberOfCoefficients) {
    return {
      ok: false,
      reason: `извлекатель вернул ${Array.isArray(raw) ? `${raw.length} значений` : 'не массив'}, ожидалось ${config.numberOfCoefficients}`,
    };
  }
  if (raw.some((v) => !Number.isFinite(v))) {
    // NaN/Infinity в векторе — тихий яд: он переживёт любое усреднение и всплывёт метрикой.
    return { ok: false, reason: 'извлекатель вернул нечисловое значение (NaN или Infinity)' };
  }

  return {
    ok: true,
    vector: {
      coefficients: Float32Array.from(raw),
      windowStartIndex: window.startIndex,
      configHash: configHashOf(config),
    },
  };
}
