import type { SampleDetectionVerdict } from '@membrana/detector-base';
import {
  buildTemplateMatchBreakdown,
  classifyTrends,
  FREE_V1_CLASS_MIN_CONFIDENCE,
  FREE_V1_DRONE_FIRST_MIN_GAP,
  type ClassifyTrendsOptions,
  type PatternTemplate,
  type TemplateMatchBreakdown as TrendsTemplateMatchBreakdown,
  type TrendsDetectionResult,
} from '@membrana/trends-detector-service';

import { collectMetricSamples } from './collect-metric-samples.js';
import {
  DEFAULT_ACTIVITY_RMS_THRESHOLD,
  DEFAULT_INTERVAL_MS,
  DEFAULT_MEASUREMENTS_COUNT,
  DEFAULT_MIN_CONFIDENCE,
  DRONE_TEMPLATE_KEY_PREFIX,
} from './constants.js';
import { isDroneTemplateKey } from './resolve-catalog.js';
import type { TemplateMatchDetectorConfig } from './types.js';

type ResolvedTemplateMatchConfig = Required<
  Pick<
    TemplateMatchDetectorConfig,
    'templates' | 'minConfidence' | 'activityRmsThreshold' | 'droneKeyPrefix'
  >
> & {
  metricCollection: NonNullable<TemplateMatchDetectorConfig['metricCollection']>;
};

function resolveConfig(config: TemplateMatchDetectorConfig): ResolvedTemplateMatchConfig {
  if (config.templates.length === 0) {
    throw new Error('TemplateMatchDetector requires at least one template');
  }
  return {
    templates: config.templates,
    minConfidence: config.minConfidence ?? DEFAULT_MIN_CONFIDENCE,
    activityRmsThreshold: config.activityRmsThreshold ?? DEFAULT_ACTIVITY_RMS_THRESHOLD,
    droneKeyPrefix: config.droneKeyPrefix ?? DRONE_TEMPLATE_KEY_PREFIX,
    metricCollection: {
      measurementsCount:
        config.metricCollection?.measurementsCount ?? DEFAULT_MEASUREMENTS_COUNT,
      intervalMs: config.metricCollection?.intervalMs ?? DEFAULT_INTERVAL_MS,
      fftSize: config.metricCollection?.fftSize,
    },
  };
}

/**
 * Опции classifyTrends для template-match — та же free-v1 калибровка, что в
 * trends stage-gate пути (fv1-s3): drone-first gap + пер-классовые пороги.
 * Регрессия 2026-07-03: после добавления FREE_V1_NON_DRONE_TEMPLATES в каталог
 * (resolve-catalog) конкуренты перебивали DRONE_* без этих опций →
 * isDrone всегда false (benchmark recall 0.000 на v0.2 при таблице 88.3%).
 */
export function buildClassifyOptions(
  resolved: Pick<ResolvedTemplateMatchConfig, 'minConfidence' | 'activityRmsThreshold'>,
): ClassifyTrendsOptions {
  return {
    minConfidence: resolved.minConfidence,
    activityRmsThreshold: resolved.activityRmsThreshold,
    droneFirstMinGap: FREE_V1_DRONE_FIRST_MIN_GAP,
    classMinConfidence: FREE_V1_CLASS_MIN_CONFIDENCE,
  };
}

function pickWinnerTemplate(
  templates: readonly PatternTemplate[],
  trendsResult: TrendsDetectionResult,
): PatternTemplate {
  const topKey = trendsResult.scores[0]?.key ?? trendsResult.detectedState;
  const matched = templates.find((template) => template.key === topKey);
  if (matched) {
    return matched;
  }
  return templates[0]!;
}

export interface TemplateMatchSampleAnalysis {
  readonly verdict: SampleDetectionVerdict;
  readonly minConfidence: number;
  readonly trendsResult: TrendsDetectionResult;
  readonly winnerTemplate: PatternTemplate;
  readonly trendsBreakdown: TrendsTemplateMatchBreakdown;
}

/**
 * Run template-match classification on a full sample buffer with detailed breakdown.
 */
export function runTemplateMatchSampleAnalysis(
  samples: Float32Array,
  sampleRate: number,
  config: TemplateMatchDetectorConfig,
  latencyMsTotal: number,
): TemplateMatchSampleAnalysis {
  const resolved = resolveConfig(config);
  const metricSamples = collectMetricSamples(
    samples,
    sampleRate,
    resolved.metricCollection,
  );
  const sampleDurationSec = samples.length / sampleRate;

  if (metricSamples.length === 0) {
    const emptyTrends: TrendsDetectionResult = {
      class: 'unknown',
      isDrone: false,
      isClassified: false,
      detectedState: 'UNKNOWN',
      detectedStateName: 'Неизвестно',
      detectedStateIcon: '❓',
      detectedStateColor: '#999',
      confidence: 0,
      confidenceLevel: 'veryLow',
      samples: [],
      isDetected: false,
      scores: [],
      temporalFeatures: null,
    };
    const winnerTemplate = resolved.templates[0]!;
    return {
      verdict: {
        detectorName: 'template-match',
        detectorFamily: 'dsp',
        sampleRate,
        sampleDurationSec,
        frameCount: 0,
        isDrone: false,
        confidence: 0,
        maxFrameConfidence: 0,
        latencyMsTotal,
      },
      minConfidence: resolved.minConfidence / 100,
      trendsResult: emptyTrends,
      winnerTemplate,
      trendsBreakdown: {
        templateKey: winnerTemplate.key,
        overallScore: 0,
        spectralScore: 0,
        temporalScore: 0,
        fields: [],
      },
    };
  }

  const trendsResult = classifyTrends(
    metricSamples,
    resolved.templates,
    buildClassifyOptions(resolved),
  );

  const isDrone =
    trendsResult.isDetected &&
    isDroneTemplateKey(trendsResult.detectedState, resolved.droneKeyPrefix) &&
    trendsResult.confidence >= resolved.minConfidence;

  const winnerTemplate = pickWinnerTemplate(resolved.templates, trendsResult);
  const temporalFeatures = trendsResult.temporalFeatures ?? {
    centroidStd: 0,
    fluxStd: 0,
    rmsStd: 0,
    activityRatio: 0,
    avgSilenceDuration: 0,
    avgBurstDuration: 0,
    frequencyJumps: {
      enabled: false,
      actualJumps: 0,
      densityPerSecond: 0,
      minJumpsRequired: 0,
      magnitudeRange: { min: 0, max: 0, avg: 0 },
    },
    volumeTrend: 'stable',
    frequencyTrend: 'stable',
    longTermStability: 'stable',
    periodicity: 'none',
    envelopeShape: 'flat',
    peakToAverageRatio: 1,
  };

  const trendsBreakdown = buildTemplateMatchBreakdown(
    temporalFeatures,
    winnerTemplate,
    metricSamples,
  );

  return {
    verdict: {
      detectorName: 'template-match',
      detectorFamily: 'dsp',
      sampleRate,
      sampleDurationSec,
      frameCount: metricSamples.length,
      isDrone,
      confidence: trendsResult.confidence / 100,
      maxFrameConfidence: trendsResult.confidence / 100,
      latencyMsTotal,
    },
    minConfidence: resolved.minConfidence / 100,
    trendsResult,
    winnerTemplate,
    trendsBreakdown,
  };
}
