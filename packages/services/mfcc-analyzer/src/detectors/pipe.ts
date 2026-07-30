/**
 * Труба — мин-макс коридор по кепстральным коэффициентам.
 *
 * Прямой аналог `packages/services/fft-analyzer/src/math/threshold-test.ts`, но с одним
 * несущим отличием: там на кадр приходили ТРИ скаляра (centroid/flux/rms) и «строгость»
 * выражалась числом метрик из трёх. Здесь на кадр приходит ВЕКТОР из десятков коэффициентов,
 * и перечислять «сколько из тридцати» нечем. Поэтому строгость выражена **долей коэффициентов
 * в коридоре** (`minInBandRatio`) — решение профильного контекста (Дынин, блок `mfcc-detectors`).
 *
 * C0 (энергетический коэффициент) НЕ исключён из контракта: у него собственный коридор, как у
 * любого другого, а если подбор на своих записях покажет, что он размывает селективность —
 * его номер называют в `judgedCoefficients`, и он выходит из счёта явным актом, а не втихую.
 *
 * Умолчаний нет ни у одного числа. Труба ничего не выбирает за исполнителя: коридор снимается
 * на своих записях, а не назначается пакетом.
 *
 * ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ, названное на ревью (Дынин, второй прогон): голоса коэффициентов
 * РАВНОВЕСНЫ. На корпусе, где 29 коэффициентов из 30 сидят в коридоре всегда (шумовой пол),
 * а селективен лишь один, доля даёт ложный зелёный; в обратную сторону — единственный
 * сработавший селективный признак тонет как 1/30. Закрывается весами голосов или отбором
 * селективных номеров; отбор здесь уже возможен (`judgedCoefficients`), веса — нет. Веса без
 * замера селективности на своих записях были бы числами, взятыми из воздуха, поэтому предмет
 * принадлежит блоку подбора параметров (`mfcc-compare-run`), а не этому.
 */
import type { MfccVector } from '../types.js';
import {
  boundsProblem,
  inBounds,
  judgeRun,
  magnitudeOf,
  ratioProblem,
  refuse,
  type Bounds,
  type DetectorOutcome,
} from './common.js';

export type PipeFrameState = 'passed' | 'failed' | 'silent';

export interface PipeSpec {
  /** Коридор на каждый коэффициент; длина обязана совпасть с длиной вектора. */
  readonly bounds: readonly Bounds[];
  /**
   * Отпечаток настроек, при которых снимался коридор. Корпус с другим отпечатком отвергается:
   * коридор, снятый при 26 фильтрах, ничего не говорит о векторе при 40.
   */
  readonly configHash: string;
  /** Доля коэффициентов в коридоре, при которой кадр считается прошедшим. */
  readonly minInBandRatio: number;
  /** Доля прошедших кадров среди СУДИМЫХ, при которой прогон считается детекцией. */
  readonly minPassRate: number;
  /**
   * Норма вектора, ниже которой кадр не судим («немой»). Без этого порога кадр из одних нулей
   * попадает в любой коридор, включающий ноль, и труба радостно даёт зелёный на тишине.
   * Значение `0` выключает защиту — тогда `silentCount` в отчёте останется единственным
   * признаком, что защиты не было.
   */
  readonly minMagnitude: number;
  /**
   * Номера коэффициентов, которые идут в счёт. `null` — все. Закрытый явный список вместо
   * флага «исключить C0»: исключение по имени превратилось бы в скрытую политику пакета.
   */
  readonly judgedCoefficients: readonly number[] | null;
}

export interface PipeFrameVerdict {
  readonly windowStartIndex: number;
  readonly magnitude: number;
  readonly inBandCount: number;
  readonly judgedCoefficientCount: number;
  readonly inBandRatio: number;
  readonly state: PipeFrameState;
}

export interface PipeReport {
  readonly configHash: string;
  readonly frames: readonly PipeFrameVerdict[];
  /** Кадры, которые вообще судились (немые в знаменатель не идут). */
  readonly judgedCount: number;
  readonly silentCount: number;
  readonly passedCount: number;
  /** `passedCount / judgedCount`. */
  readonly passRate: number;
  readonly detected: boolean;
}

function specProblem(spec: PipeSpec, coefficientCount: number): string | null {
  const bp = boundsProblem(spec.bounds, coefficientCount);
  if (bp !== null) return bp;
  const rp =
    ratioProblem('minInBandRatio', spec.minInBandRatio) ??
    ratioProblem('minPassRate', spec.minPassRate);
  if (rp !== null) return rp;
  if (!Number.isFinite(spec.minMagnitude) || spec.minMagnitude < 0) {
    return `minMagnitude=${String(spec.minMagnitude)} — не конечное ≥ 0`;
  }
  if (spec.judgedCoefficients !== null) {
    if (spec.judgedCoefficients.length === 0) return 'judgedCoefficients пуст — судить нечем';
    for (const k of spec.judgedCoefficients) {
      if (!Number.isInteger(k) || k < 0 || k >= coefficientCount) {
        return `judgedCoefficients: номер ${String(k)} вне [0, ${coefficientCount - 1}]`;
      }
    }
  }
  return null;
}

/**
 * Судить прогон трубой. Отказ — с причиной; `detected:false` означает «судили и не нашли»,
 * и это НЕ то же самое, что «судить было нечем».
 */
export function evaluatePipe(
  vectors: readonly MfccVector[],
  spec: PipeSpec,
): DetectorOutcome<PipeReport> {
  return judgeRun(
    vectors,
    { minCount: 1, expectedConfigHash: spec.configHash },
    (run) => {
      const problem = specProblem(spec, run.coefficientCount);
      if (problem !== null) return refuse(`труба негодна: ${problem}`);

      const indices =
        spec.judgedCoefficients ??
        Array.from({ length: run.coefficientCount }, (_, i) => i);

      const frames: PipeFrameVerdict[] = [];
      let judgedCount = 0;
      let silentCount = 0;
      let passedCount = 0;

      for (const vector of run.vectors) {
        const magnitude = magnitudeOf(vector.coefficients);
        if (magnitude < spec.minMagnitude) {
          silentCount++;
          frames.push({
            windowStartIndex: vector.windowStartIndex,
            magnitude,
            inBandCount: 0,
            judgedCoefficientCount: indices.length,
            inBandRatio: 0,
            state: 'silent',
          });
          continue;
        }

        let inBandCount = 0;
        for (const k of indices) {
          if (inBounds(vector.coefficients[k]!, spec.bounds[k]!)) inBandCount++;
        }
        const inBandRatio = inBandCount / indices.length;
        const passed = inBandRatio >= spec.minInBandRatio;
        judgedCount++;
        if (passed) passedCount++;
        frames.push({
          windowStartIndex: vector.windowStartIndex,
          magnitude,
          inBandCount,
          judgedCoefficientCount: indices.length,
          inBandRatio,
          state: passed ? 'passed' : 'failed',
        });
      }

      if (judgedCount === 0) {
        // Ноль судимых кадров — не «не обнаружено», а «нечем судить»: вернуть detected:false
        // здесь значило бы выдать тишину за проверенное отсутствие дрона.
        return refuse(
          `все ${run.vectors.length} кадров немые (норма < ${spec.minMagnitude}) — судить нечем`,
        );
      }

      const passRate = passedCount / judgedCount;
      return {
        ok: true,
        report: {
          configHash: run.configHash,
          frames,
          judgedCount,
          silentCount,
          passedCount,
          passRate,
          detected: passRate >= spec.minPassRate,
        },
      };
    },
  );
}
