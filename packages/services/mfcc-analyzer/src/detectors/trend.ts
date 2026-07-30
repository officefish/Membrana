/**
 * Тренд — направление изменения кепстрального контура по нескольким замерам.
 *
 * Аналог `packages/services/fft-analyzer/src/math/loudness-trend.ts`: скользящее окно чётной
 * длины, старшая половина — база, младшая — «сейчас». Отличия, каждое названное:
 *
 * 1. Там сравнивались СКАЛЯРЫ (громкость), и `deltaRatio` был одномерным. Здесь замер —
 *    вектор, и одномерная свёртка обязана сказать, ЧТО именно она потеряла. Взято две оси:
 *    **форма** (косинус между средними половин — нормирован, к усилению нечувствителен) и
 *    **масштаб** (отношение норм — ровно то, что косинус теряет). Профильный контекст (Дынин)
 *    предложил один косинус и сам назвал его ложь: «дрон той же формы, но громче, читается как
 *    stable». Вторая ось эту ложь закрывает, а не обходит.
 * 2. Там при неполном окне возвращалось `stable` с `ready:false`. Здесь это **отказ**:
 *    `stable` при нехватке данных — ровно тот ложный зелёный, который блок обязан не пропускать,
 *    а потребитель, читающий только `trend`, флаг `ready` не увидит.
 *
 * Часов нет: кадры адресуются `windowStartIndex`, порядок корпуса проверен в `corpusProblem`.
 */
import type { MfccVector } from '../types.js';
import {
  cosineOf,
  judgeRun,
  magnitudeOf,
  meanOf,
  refuse,
  type DetectorOutcome,
} from './common.js';

/** Закрытый список вердиктов. Приоритет: форма важнее масштаба (см. `verdictOf`). */
export type MfccTrend = 'steady' | 'drifting' | 'amplifying' | 'attenuating';

export interface TrendSpec {
  /** Длина окна в кадрах: чётное ≥ 2, делится на две равные половины. */
  readonly windowSize: number;
  /** Порог изменения ФОРМЫ: `1 − cos ≥ shapeDeltaThreshold` → `drifting`. */
  readonly shapeDeltaThreshold: number;
  /** Порог изменения МАСШТАБА по модулю: `|scaleRatio| ≥ scaleRatioThreshold`. */
  readonly scaleRatioThreshold: number;
  /** Норма средней половины, ниже которой окно не судим (деление на шум). */
  readonly minMagnitude: number;
}

export interface TrendReport {
  readonly configHash: string;
  readonly trend: MfccTrend;
  /** `1 − cos(current, baseline)` ∈ [0, 2]; 0 — контур не изменился. */
  readonly shapeDelta: number;
  /** `(‖current‖ − ‖baseline‖) / ‖baseline‖`, знаковое. */
  readonly scaleRatio: number;
  readonly baselineMagnitude: number;
  readonly currentMagnitude: number;
  /** Адрес первого и последнего кадра судимого окна — вердикт привязан ко времени потока. */
  readonly fromWindowStartIndex: number;
  readonly toWindowStartIndex: number;
}

function specProblem(spec: TrendSpec): string | null {
  if (!Number.isInteger(spec.windowSize) || spec.windowSize < 2 || spec.windowSize % 2 !== 0) {
    // Не округляем молча (в отличие от аналога): подставленное за исполнителя окно меняет
    // вердикт и не видно в отчёте.
    return `windowSize=${String(spec.windowSize)} — не чётное целое ≥ 2`;
  }
  if (!Number.isFinite(spec.shapeDeltaThreshold) || spec.shapeDeltaThreshold <= 0) {
    return `shapeDeltaThreshold=${String(spec.shapeDeltaThreshold)} — не конечное > 0`;
  }
  if (!Number.isFinite(spec.scaleRatioThreshold) || spec.scaleRatioThreshold <= 0) {
    return `scaleRatioThreshold=${String(spec.scaleRatioThreshold)} — не конечное > 0`;
  }
  if (!Number.isFinite(spec.minMagnitude) || spec.minMagnitude <= 0) {
    // Здесь, в отличие от трубы, ноль запрещён: на вырожденной базе тренд делит на ноль,
    // и «выключить защиту» означало бы разрешить Infinity в вердикте.
    return `minMagnitude=${String(spec.minMagnitude)} — не конечное > 0`;
  }
  return null;
}

/**
 * Приоритет осей зафиксирован: форма перекрывает масштаб. Названный на ревью край — контур
 * изменился И одновременно затух: вердикт будет `drifting`, хотя описание «затухание со сменой
 * тембра» точнее. Это выбор контракта, а не ошибка: тремя словами двумерный исход не
 * описывается, и обе оси остаются в отчёте числами — читающий видит и `shapeDelta`, и
 * `scaleRatio`, а не только слово.
 */
function verdictOf(shapeDelta: number, scaleRatio: number, spec: TrendSpec): MfccTrend {
  if (shapeDelta >= spec.shapeDeltaThreshold) return 'drifting';
  if (scaleRatio >= spec.scaleRatioThreshold) return 'amplifying';
  if (scaleRatio <= -spec.scaleRatioThreshold) return 'attenuating';
  return 'steady';
}

/**
 * Судить тренд по ПОСЛЕДНЕМУ полному окну корпуса. Более ранние кадры не усредняются в базу:
 * скользящее окно на то и скользящее, что судит недавнее.
 */
export function evaluateTrend(
  vectors: readonly MfccVector[],
  spec: TrendSpec,
): DetectorOutcome<TrendReport> {
  const problem = specProblem(spec);
  if (problem !== null) return refuse(`тренд негоден: ${problem}`);

  return judgeRun(
    vectors,
    { minCount: spec.windowSize, expectedConfigHash: null },
    (run) => {
      const window = run.vectors.slice(run.vectors.length - spec.windowSize);
      const half = spec.windowSize / 2;
      const baseline = meanOf(window, 0, half, run.coefficientCount);
      const current = meanOf(window, half, spec.windowSize, run.coefficientCount);

      const baselineMagnitude = magnitudeOf(baseline);
      const currentMagnitude = magnitudeOf(current);
      if (baselineMagnitude < spec.minMagnitude || currentMagnitude < spec.minMagnitude) {
        // Тишина или вырожденная база: вернуть 'steady' значило бы выдать отсутствие сигнала
        // за наблюдение стабильности.
        return refuse(
          `окно вырождено: норма базы ${baselineMagnitude.toFixed(6)}, текущей ${currentMagnitude.toFixed(6)} при пороге ${spec.minMagnitude}`,
        );
      }

      const cosine = cosineOf(current, baseline);
      if (cosine === null) {
        return refuse('косинус не определён: одна из половин окна вырождена в ноль');
      }

      const shapeDelta = 1 - cosine;
      const scaleRatio = (currentMagnitude - baselineMagnitude) / baselineMagnitude;

      return {
        ok: true,
        report: {
          configHash: run.configHash,
          trend: verdictOf(shapeDelta, scaleRatio, spec),
          shapeDelta,
          scaleRatio,
          baselineMagnitude,
          currentMagnitude,
          fromWindowStartIndex: window[0]!.windowStartIndex,
          toWindowStartIndex: window[window.length - 1]!.windowStartIndex,
        },
      };
    },
  );
}
