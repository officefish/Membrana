/**
 * Заготовки для сателлитов тембрового теста. Спринт `mfcc-plugin-sprint`, блок
 * `mfcc-plugin-tests` (математик).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ ФАЙЛОМ. Сателлиты обоих предметов собирают одни и те же вещи — серию,
 * пресет, кадры. Собирать их дважды значило бы завести две расходящиеся копии допущений о
 * том, как выглядит серия, а это тот же класс дефекта, ради которого пресет держат одной
 * константой, а не числами у каждого потребителя.
 */
import { MFCC_PRESET_FIRST_CUT } from '../presets';
import type {
  MfccFrameResult,
  MfccPresetSpec,
  MfccSeriesResult,
  MfccStrictnessLevel,
} from '../types';

/** Вектор заданной нормы: все составляющие равны, длина вектора — ровно `magnitude`. */
export function vectorOfMagnitude(magnitude: number, length = 24): readonly number[] {
  const component = magnitude / Math.sqrt(length);
  return Array.from({ length }, () => component);
}

/** Выборка «тишины» с разбросом — то, что видит замер на живом, но молчащем тракте. */
export function silentVectors(count: number, base = 0.01, step = 0.001): readonly (readonly number[])[] {
  return Array.from({ length: count }, (_, i) => vectorOfMagnitude(base + i * step));
}

export function frame(
  index: number,
  state: MfccFrameResult['state'],
  magnitude = 1,
): MfccFrameResult {
  return {
    index,
    magnitude,
    judgedValues: [0, 0, 0, 0],
    inBandCount: state === 'passed' ? 4 : 0,
    judgedCount: 4,
    state,
  };
}

/**
 * Серия, собранная из заданного числа прошедших, провалившихся и немых кадров.
 *
 * Считает производные поля ровно так же, как `judgeSeries`: немые в знаменатель не идут.
 * Повторение формулы здесь намеренное — сателлит, берущий знаменатель у испытуемого, не
 * проверял бы знаменатель, а соглашался бы с ним.
 */
export function series(opts: {
  passed: number;
  failed: number;
  silent: number;
  strictness?: MfccStrictnessLevel;
  refusal?: string | null;
  detected?: boolean;
  configHash?: string;
}): MfccSeriesResult {
  const frames: MfccFrameResult[] = [];
  let i = 0;
  for (let n = 0; n < opts.passed; n += 1, i += 1) frames.push(frame(i, 'passed'));
  for (let n = 0; n < opts.failed; n += 1, i += 1) frames.push(frame(i, 'failed'));
  for (let n = 0; n < opts.silent; n += 1, i += 1) frames.push(frame(i, 'silent', 0));

  const judgedCount = opts.passed + opts.failed;
  const passRate = judgedCount === 0 ? 0 : opts.passed / judgedCount;
  return {
    configHash: opts.configHash ?? MFCC_PRESET_FIRST_CUT.configHash,
    strictness: opts.strictness ?? 'normal',
    frames,
    judgedCount,
    silentCount: opts.silent,
    passedCount: opts.passed,
    passRate,
    detected: opts.detected ?? passRate >= 0.6,
    refusal: opts.refusal ?? null,
  };
}

/** Пресет боевой первой прикидки: обстановки НЕ откалиброваны, судимых четыре из двадцати четырёх. */
export const PRESET_FIRST_CUT = MFCC_PRESET_FIRST_CUT;

/**
 * Пресет будущего — тот, которого сегодня нет: обстановки замерены, судятся все коридоры.
 * Нужен, чтобы показать, что потолок уверенности снимается именно калибровкой, а не правкой
 * отчёта.
 */
export const PRESET_CALIBRATED: MfccPresetSpec = {
  ...MFCC_PRESET_FIRST_CUT,
  judgedCoefficients: MFCC_PRESET_FIRST_CUT.bounds.map((_, i) => i),
  situationsCalibrated: true,
  provenance: 'вымысел сателлита: пресет, какого сегодня не существует',
};
