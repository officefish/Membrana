import {
  computeFrameHitRatio,
  type PatternTemplate,
  type TemporalFeatures,
  type TrendsDetectionResult,
} from '@membrana/trends-detector-service';

import {
  ENVELOPE_OPTIONS,
  FRAME_HIT_RATIO_PERCENT_MAX,
  FRAME_HIT_RATIO_PERCENT_MIN,
  PERIODICITY_OPTIONS,
  STABILITY_OPTIONS,
  TREND_OPTIONS,
  makeUserTemplateKey,
  normalizeFrameHitRatioPercent,
} from './templateEditorDefaults';

function boundsFromValues(values: readonly number[], paddingRatio = 0.12): {
  min: number;
  max: number;
} {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pad = Math.max(span * paddingRatio, max * 0.05, 0.001);
  return {
    min: Math.max(0, min - pad),
    max: max + pad,
  };
}

function boundsAround(value: number, marginRatio = 0.35, floor = 0): {
  min: number;
  max: number;
} {
  const magnitude = Math.max(Math.abs(value), 0.001);
  const margin = Math.max(magnitude * marginRatio, magnitude * 0.1, 0.001);
  return {
    min: Math.max(floor, value - margin),
    max: value + margin,
  };
}

function pickOption<T extends string>(
  value: string,
  options: readonly T[],
): readonly T[] | undefined {
  return options.includes(value as T) ? [value as T] : undefined;
}

function buildFrameHitRatio(
  samples: TrendsDetectionResult['samples'],
  thresholds: PatternTemplate['thresholds'],
): { min: number; max: number } {
  const actualPercent = Math.round(computeFrameHitRatio(samples, thresholds) * 100);
  const center = Math.min(
    FRAME_HIT_RATIO_PERCENT_MAX,
    Math.max(FRAME_HIT_RATIO_PERCENT_MIN, actualPercent),
  );
  const minPercent = Math.max(FRAME_HIT_RATIO_PERCENT_MIN, center - 5);
  const maxPercent = Math.min(
    FRAME_HIT_RATIO_PERCENT_MAX,
    Math.max(center + 5, minPercent + 1),
  );
  return normalizeFrameHitRatioPercent(minPercent, maxPercent);
}

function buildTemporalPatterns(features: TemporalFeatures): PatternTemplate['temporalPatterns'] {
  const volumeTrend = pickOption(features.volumeTrend, TREND_OPTIONS);
  const frequencyTrend = pickOption(features.frequencyTrend, TREND_OPTIONS);
  const longTermStability = pickOption(features.longTermStability, STABILITY_OPTIONS);
  const periodicity = pickOption(features.periodicity, PERIODICITY_OPTIONS);
  const envelopeShape = pickOption(features.envelopeShape, ENVELOPE_OPTIONS);
  const jumps = features.frequencyJumps;

  return {
    ...(volumeTrend ? { volumeTrend } : {}),
    ...(frequencyTrend ? { frequencyTrend } : {}),
    ...(longTermStability ? { longTermStability } : {}),
    ...(periodicity ? { periodicity } : {}),
    ...(envelopeShape ? { envelopeShape } : {}),
    centroidStd: boundsAround(features.centroidStd, 0.4, 0),
    fluxStd: boundsAround(features.fluxStd, 0.4, 0),
    rmsStd: boundsAround(features.rmsStd, 0.4, 0),
    activityRatio: boundsAround(features.activityRatio, 0.25, 0),
    avgSilenceDuration: boundsAround(features.avgSilenceDuration, 0.5, 0),
    avgBurstDuration: boundsAround(features.avgBurstDuration, 0.5, 0),
    ...(jumps.enabled || jumps.actualJumps > 0
      ? {
          frequencyJumps: {
            enabled: true,
            minJumpsRequired: Math.max(0, jumps.actualJumps),
            densityPerSecond: {
              max: Math.max(jumps.densityPerSecond * 1.5, jumps.densityPerSecond + 0.5, 0.5),
            },
          },
        }
      : {}),
  };
}

export function canBuildTemplateFromAnalysis(
  result: TrendsDetectionResult | null | undefined,
): result is TrendsDetectionResult {
  return (
    result != null &&
    result.samples.length > 0 &&
    result.temporalFeatures != null
  );
}

export function buildTemplateFromAnalysis(
  result: TrendsDetectionResult,
  existingKeys: readonly string[],
): PatternTemplate {
  if (!canBuildTemplateFromAnalysis(result)) {
    throw new Error('Недостаточно данных последнего анализа для создания шаблона');
  }

  const { samples } = result;
  const temporalFeatures = result.temporalFeatures;
  if (temporalFeatures == null) {
    throw new Error('Недостаточно данных последнего анализа для создания шаблона');
  }
  const centroid = boundsFromValues(samples.map((s) => s.centroid));
  const flux = boundsFromValues(samples.map((s) => s.flux));
  const rms = boundsFromValues(samples.map((s) => s.rms));

  const thresholds: PatternTemplate['thresholds'] = {
    centroid,
    flux,
    rms,
    frameHitRatio: buildFrameHitRatio(samples, { centroid, flux, rms }),
  };

  const detectedLabel = result.isDetected ? result.detectedStateName : null;
  const name = detectedLabel ? `Сцена: ${detectedLabel}` : 'Шаблон из анализа';

  return {
    key: makeUserTemplateKey(name, existingKeys),
    name,
    icon: result.isDetected ? result.detectedStateIcon : '📊',
    color: result.isDetected ? result.detectedStateColor : '#7c9cff',
    description: `Создан из анализа (${samples.length} замеров, уверенность ${Math.round(result.confidence)}%)`,
    thresholds,
    temporalPatterns: buildTemporalPatterns(temporalFeatures),
  };
}
