/**
 * Считалка кепстральных коэффициентов для прибора тембрового теста.
 * Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-wiring` (структурщик) — блок ВКЛЮЧЕНИЯ.
 *
 * ПОЧЕМУ ОНА ЖИВЁТ ЗДЕСЬ, А НЕ В ЯДРЕ. Ядро (`@membrana/mfcc-analyzer-service`) держит
 * `MfccExtractor` инъецируемым нарочно: «замена библиотеки на другую или на собственный DCT
 * не требует правок вне ядра». Имя `meyda` за периметр ядра не выходит. Клиент — инъектор,
 * значит конкретная библиотека принадлежит ему. Приговор структурщика по этому блоку:
 * «законно, с условием» — библиотека в `dependencies` клиента, не в `devDependencies` корня,
 * потому что это рантайм-зависимость прибора, а не тулинг.
 *
 * НАСТРОЙКИ ЗАДАЮТСЯ СВОЙСТВАМИ ОБЪЕКТА. Урок 31.07, записанный в контракте ядра:
 * `Meyda.extract('mfcc', buf, {melBands: 26})` и то же с `melBands: 40` дают ПОБАЙТОВО
 * одинаковый выход — параметр вызова молча игнорируется. Следствие: считалка, которую подаёт
 * вызывающий, обязана применить настройки САМА.
 *
 * СОБСТВЕННЫЙ ЭКЗЕМПЛЯР, А НЕ ГЛОБАЛЬНЫЙ ОБЪЕКТ. Настройки на общей `Meyda` — общее
 * состояние: второй прибор на странице молча перебьёт первому число фильтров, и тот
 * продолжит считать, отдавая другие числа под тем же отпечатком. Замер 31.07 на живом пакете:
 *
 *   спред, чередование p40 → p13 → p40 снова:  −72.227 → 161.832 → −72.227  (изолирует)
 *   глобальная `Meyda.melBands` после прогона:  не тронута
 *   переутверждение настроек перед каждым кадром: тоже устойчиво, но пишет в общий объект
 *                                                 и стоит 2.898 мс против 2.250 мс на кадр
 *
 * Поэтому экземпляр свой. Он работает, потому что `extract` читает настройки с `this`.
 */
import Meyda from 'meyda';

import { configFromHash } from './mfccAnalyzerPlugin';

/** Считалка одного кадра. `null` — кадр не сосчитан, и это НЕ ноль коэффициентов. */
export type MfccFrameExtractor = (samples: Float32Array) => readonly number[] | null;

/**
 * Считалка при настройках, разобранных из отпечатка пресета.
 *
 * @throws если отпечаток не разбирается — молчаливое умолчание здесь означало бы считать
 *   кадры при одних настройках, а судить воротами, снятыми при других.
 */
export function createMfccExtractor(configHash: string): MfccFrameExtractor {
  const config = configFromHash(configHash);
  if (config === null) {
    throw new Error(
      `mfccExtractor: отпечаток «${configHash}» не разбирается — при каких настройках считать, неизвестно`,
    );
  }

  // Собственный экземпляр настроек. Спред копирует и `extract`, и поля; вызов через этот
  // объект читает НАШИ значения, а общий объект остаётся нетронутым — замер выше.
  const instance = {
    ...Meyda,
    bufferSize: config.bufferSize,
    melBands: config.melBands,
    numberOfMFCCCoefficients: config.numberOfCoefficients,
  };

  return (samples: Float32Array): readonly number[] | null => {
    // Кадр чужой длины не подгоняется: коэффициенты при другом окне несравнимы с воротами.
    if (samples.length !== config.bufferSize) return null;
    const vector = instance.extract('mfcc', samples);
    if (!Array.isArray(vector) || vector.length !== config.numberOfCoefficients) return null;
    return vector as readonly number[];
  };
}

/**
 * Считалка боевого пресета — одна на всё приложение.
 *
 * Ленивая и единственная НЕ ради экономии: панель получает её пропом при каждой отрисовке, и
 * новая ссылка на каждый кадр пересоздавала бы жизненный цикл прибора. Ссылка обязана быть
 * устойчивой.
 */
const shared = new Map<string, MfccFrameExtractor>();

export function getMfccExtractor(configHash: string): MfccFrameExtractor {
  // Ключ — отпечаток, а не «одна на всё». Память под один экземпляр вернула бы считалку при
  // ЧУЖИХ настройках тому, кто попросил о своих, — и тихо, потому что длина вектора совпала бы.
  const found = shared.get(configHash);
  if (found !== undefined) return found;
  const made = createMfccExtractor(configHash);
  shared.set(configHash, made);
  return made;
}
