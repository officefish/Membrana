/**
 * Отчёт по серии: что произошло, на чём вердикт держится и где он держится слабо.
 * Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-math` (математик).
 *
 * ЗАЧЕМ. Прибор разведки должен показать не только «цель есть / цели нет», но и ПОЧЕМУ.
 * Экран (блок верстальщика) отчёт только рисует; считает его этот файл.
 *
 * УВЕРЕННОСТЬ — СЛОВОМ, А НЕ ЧИСЛОМ. Требование математика, принятое дословно: «числа
 * создают ложную точность, категории честнее». Число в долях единицы читалось бы как
 * вероятность того, что это дрон, а `passRate` — вероятность того, что кадры прошли ворота.
 * Разные вещи, и подменять одну другой значит соврать в пользу прибора.
 *
 * ВЫСОКАЯ УВЕРЕННОСТЬ СЕГОДНЯ НЕДОСТИЖИМА — и это сделано нарочно. Пока в пресете
 * `situationsCalibrated: false`, потолок отчёта — «средняя». Ворота сняты на корпусе, где
 * тракт записи склеен с меткой класса, и три обстановки владельца не мерялись вовсе. Прибор,
 * который в таком состоянии говорит «уверенно», врёт не в мелочи, а в главном.
 */
import type {
  MfccPresetSpec,
  MfccSeriesResult,
  MfccStrictnessLevel,
} from './types';

/** Уверенность отчёта. Закрытый список из трёх слов, чисел здесь нет намеренно. */
export type MfccReportConfidence = 'high' | 'medium' | 'low';

/** Доля немых кадров, выше которой серия считается снятой в неподходящих условиях. */
export const SILENT_RATE_ALARM = 0.3;

/** Сколько судимых кадров — уже не выборка, а случайность. Длины серий закрыты: 3/5/7/10. */
export const TOO_FEW_JUDGED = 2;

export interface MfccTestReport {
  readonly configHash: string;
  readonly strictnessUsed: MfccStrictnessLevel;
  /** `inconclusive` — серия не судима вовсе; это НЕ то же самое, что «цели нет». */
  readonly verdict: 'detected' | 'not_detected' | 'inconclusive';
  readonly confidence: MfccReportConfidence;
  readonly summary: {
    readonly totalFrames: number;
    readonly silentFrames: number;
    readonly judgedFrames: number;
    readonly passedFrames: number;
    readonly passRate: number;
    readonly silentRate: number;
  };
  /** Порог немого кадра, действовавший в этом прогоне. `0` значит, что защиты не было. */
  readonly magnitudeFloorUsed: number;
  /** Человеческим языком: на чём держится вердикт. */
  readonly reasoning: string;
  /** Всё, что делает вердикт слабее, чем он выглядит. Пустой список — редкость, а не норма. */
  readonly warnings: readonly string[];
}

/**
 * Оговорки к вердикту. Собираются ВСЕГДА, а не только при плохом результате: зелёный
 * вердикт с невидимой оговоркой опаснее красного.
 */
function collectWarnings(
  series: MfccSeriesResult,
  preset: MfccPresetSpec,
  magnitudeFloorUsed: number,
  silentRate: number,
): string[] {
  const warnings: string[] = [];

  if (!preset.situationsCalibrated) {
    warnings.push(
      'три обстановки (строгий — дрон · средний — модели и ветер · мягкий — цель под ' +
        'моторами и стрельбой) НЕ откалиброваны: имена уровней держатся на аналогии с ' +
        'прежним детектором, а не на измерении',
    );
  }

  if (preset.judgedCoefficients.length < preset.bounds.length) {
    warnings.push(
      `судятся ${preset.judgedCoefficients.length} коэффициента из ${preset.bounds.length}: ` +
        'остальные на корпусе классы не различали',
    );
  }

  if (!(magnitudeFloorUsed > 0)) {
    warnings.push(
      'порог немого кадра не замерен — защиты от тишины нет: кадр из околонулевых ' +
        'коэффициентов проходит любой коридор, включающий ноль',
    );
  }

  if (silentRate > SILENT_RATE_ALARM) {
    warnings.push(
      `немых кадров ${(silentRate * 100).toFixed(0)}% — больше ` +
        `${SILENT_RATE_ALARM * 100}%: серия снята на почти молчащем тракте`,
    );
  }

  if (series.refusal === null && series.judgedCount <= TOO_FEW_JUDGED) {
    warnings.push(
      `судимых кадров всего ${series.judgedCount} — доля прошедших по такой выборке ` +
        'случайна, а не показательна',
    );
  }

  return warnings;
}

/**
 * Уверенность.
 *
 * Порог «высокой» требует И плотного прохождения, И почти полного отсутствия немых кадров,
 * И замеренной защиты, И откалиброванных обстановок — все четыре разом. Соединение через «и»
 * намеренное: у математика в наброске стояло «или», и при нём серия с долей прохождения 0.1,
 * но чистая от тишины, получала бы «среднюю» — то есть провал звучал бы обнадёживающе.
 */
function judgeConfidence(
  series: MfccSeriesResult,
  preset: MfccPresetSpec,
  magnitudeFloorUsed: number,
  silentRate: number,
): MfccReportConfidence {
  if (
    series.refusal !== null ||
    series.judgedCount <= TOO_FEW_JUDGED ||
    silentRate >= SILENT_RATE_ALARM ||
    !(magnitudeFloorUsed > 0)
  ) {
    return 'low';
  }
  if (
    preset.situationsCalibrated &&
    series.passRate >= 0.95 &&
    silentRate < 0.1
  ) {
    return 'high';
  }
  return series.passRate >= 0.7 ? 'medium' : 'low';
}

export function buildMfccTestReport(
  series: MfccSeriesResult,
  preset: MfccPresetSpec,
  magnitudeFloorUsed: number,
): MfccTestReport {
  const totalFrames = series.frames.length;
  const silentRate = totalFrames === 0 ? 0 : series.silentCount / totalFrames;

  const reasoning =
    series.refusal !== null
      ? `судить не по чему: ${series.refusal}`
      : series.detected
        ? `прошли ${series.passedCount} из ${series.judgedCount} судимых кадров ` +
          `(${(series.passRate * 100).toFixed(0)}%), порог уровня «${series.strictness}» взят`
        : `прошли ${series.passedCount} из ${series.judgedCount} судимых кадров ` +
          `(${(series.passRate * 100).toFixed(0)}%) — порога уровня «${series.strictness}» не хватило`;

  return {
    configHash: series.configHash,
    strictnessUsed: series.strictness,
    verdict:
      series.refusal !== null ? 'inconclusive' : series.detected ? 'detected' : 'not_detected',
    confidence: judgeConfidence(series, preset, magnitudeFloorUsed, silentRate),
    summary: {
      totalFrames,
      silentFrames: series.silentCount,
      judgedFrames: series.judgedCount,
      passedFrames: series.passedCount,
      passRate: series.passRate,
      silentRate,
    },
    magnitudeFloorUsed,
    reasoning,
    warnings: collectWarnings(series, preset, magnitudeFloorUsed, silentRate),
  };
}
