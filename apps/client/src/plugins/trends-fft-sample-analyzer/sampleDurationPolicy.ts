import { MEASUREMENTS_MIN } from '../trends-fft-analyzer/measurementPresets';

/** Минимальная длительность сэмпла для анализа (сек). */
export const SAMPLE_DURATION_MIN_SEC = 1;

/** Максимальная длина сегмента анализа для длинных файлов (сек). */
export const SAMPLE_DURATION_MAX_SEC = 10;

export type SampleDurationStatus =
  | 'ok'
  | 'too_long_truncated'
  | 'window_clamped';

export interface SampleDurationPlan {
  readonly status: SampleDurationStatus;
  readonly fileDurationSec: number;
  readonly analysisSegmentSec: number;
  readonly requestedMeasurementsCount: number;
  readonly effectiveMeasurementsCount: number;
  readonly intervalMs: number;
  readonly message: string | null;
}

export type SampleDurationBlock =
  | { readonly kind: 'allowed'; readonly plan: SampleDurationPlan }
  | { readonly kind: 'blocked'; readonly reason: string };

export function resolveSampleDurationPlan(
  fileDurationSec: number,
  measurementsCount: number,
  intervalMs: number,
): SampleDurationBlock {
  if (!Number.isFinite(fileDurationSec) || fileDurationSec <= 0) {
    return {
      kind: 'blocked',
      reason: 'Не удалось определить длительность сэмпла. Выберите файл в таблице.',
    };
  }

  if (fileDurationSec < SAMPLE_DURATION_MIN_SEC) {
    return {
      kind: 'blocked',
      reason: `Сэмпл слишком короткий (${fileDurationSec.toFixed(2)} с). Минимум ${SAMPLE_DURATION_MIN_SEC} с.`,
    };
  }

  const analysisSegmentSec = Math.min(fileDurationSec, SAMPLE_DURATION_MAX_SEC);
  const maxMeasurementsFromSegment = Math.max(
    1,
    Math.floor((analysisSegmentSec * 1000) / intervalMs),
  );
  const effectiveMeasurementsCount = Math.min(measurementsCount, maxMeasurementsFromSegment);

  if (effectiveMeasurementsCount < MEASUREMENTS_MIN) {
    return {
      kind: 'blocked',
      reason: `При интервале ${intervalMs} мс в ${analysisSegmentSec.toFixed(1)} с помещается меньше ${MEASUREMENTS_MIN} замеров. Уменьшите интервал или увеличьте длительность сэмпла.`,
    };
  }

  let status: SampleDurationStatus = 'ok';
  let message: string | null = null;

  if (fileDurationSec > SAMPLE_DURATION_MAX_SEC) {
    status = 'too_long_truncated';
    message = `Сэмпл ${fileDurationSec.toFixed(1)} с — анализируются первые ${SAMPLE_DURATION_MAX_SEC} с.`;
  }

  if (measurementsCount > effectiveMeasurementsCount) {
    status = status === 'too_long_truncated' ? 'too_long_truncated' : 'window_clamped';
    const windowNote = `Окно ${measurementsCount}×${intervalMs} мс не помещается — используем ${effectiveMeasurementsCount} замеров (${((effectiveMeasurementsCount * intervalMs) / 1000).toFixed(1)} с).`;
    message = message ? `${message} ${windowNote}` : windowNote;
  }

  return {
    kind: 'allowed',
    plan: {
      status,
      fileDurationSec,
      analysisSegmentSec,
      requestedMeasurementsCount: measurementsCount,
      effectiveMeasurementsCount,
      intervalMs,
      message,
    },
  };
}
