import type {
  ClassifyTrendsOptions,
  ConfidenceLevel,
  MetricSample,
  PatternTemplate,
  TrendsDetectionResult,
} from './types.js';
import { computeTemporalFeatures } from './math/temporalFeatures.js';
import { scoreTemplate } from './math/scoring.js';
import { templateCountsAsDetection } from './templateCountsAsDetection.js';
import { soundClassFromTemplateKey } from './sound-class.js';

const CONFIDENCE_THRESHOLDS = {
  high: 75,
  medium: 55,
  low: 35,
} as const;

function confidenceLevel(
  winnerScore: number,
  secondScore: number,
): ConfidenceLevel {
  const gap = winnerScore - secondScore;
  if (winnerScore >= CONFIDENCE_THRESHOLDS.high && gap >= 15) return 'high';
  if (winnerScore >= CONFIDENCE_THRESHOLDS.medium && gap >= 8) return 'medium';
  if (winnerScore >= CONFIDENCE_THRESHOLDS.low) return 'low';
  return 'veryLow';
}

function unknownResult(samples: readonly MetricSample[]): TrendsDetectionResult {
  return {
    class: 'unknown',
    isDrone: false,
    isClassified: false,
    detectedState: 'UNKNOWN',
    detectedStateName: 'Неизвестно',
    detectedStateIcon: '❓',
    detectedStateColor: '#999',
    confidence: 0,
    confidenceLevel: 'veryLow',
    samples,
    isDetected: false,
    scores: [],
    temporalFeatures: null,
  };
}

export function classifyTrends(
  samples: readonly MetricSample[],
  templates: readonly PatternTemplate[],
  options: ClassifyTrendsOptions = {},
): TrendsDetectionResult {
  const minConfidence = options.minConfidence ?? CONFIDENCE_THRESHOLDS.low;
  const activityRmsThreshold = options.activityRmsThreshold ?? 0.02;

  if (samples.length === 0 || templates.length === 0) {
    return unknownResult(samples);
  }

  const features = computeTemporalFeatures(samples, activityRmsThreshold);
  let scores = templates.map((template) => {
    const scored = scoreTemplate(features, template, samples);
    return {
      key: template.key,
      score: scored.score,
      spectralScore: scored.spectralScore,
      temporalScore: scored.temporalScore,
    };
  });

  scores.sort((a, b) => b.score - a.score);

  // Drone-first policy: non-drone class must win by droneFirstMinGap points to override.
  if (options.droneFirstMinGap && options.droneFirstMinGap > 0) {
    const droneFirst = scores.find((s) => {
      const t = templates.find((t) => t.key === s.key);
      return t ? templateCountsAsDetection(t) : false;
    });
    if (droneFirst) {
      const winner = scores[0]!;
      const winnerTpl = templates.find((t) => t.key === winner.key);
      const winnerIsDrone = winnerTpl ? templateCountsAsDetection(winnerTpl) : false;
      if (!winnerIsDrone && winner.score - droneFirst.score < options.droneFirstMinGap) {
        scores = [droneFirst, ...scores.filter((s) => s.key !== droneFirst.key)];
      }
    }
  }

  const best = scores[0]!;
  const second = scores[1];
  const winnerTemplate = templates.find((t) => t.key === best.key);

  const roundedConfidence = Math.round(best.score);
  const level = confidenceLevel(best.score, second?.score ?? 0);
  const countsAsDetection = winnerTemplate ? templateCountsAsDetection(winnerTemplate) : false;
  const winnerClass = soundClassFromTemplateKey(best.key);
  const winnerThreshold = options.classMinConfidence?.[winnerClass] ?? minConfidence;
  const isClassified = winnerClass !== 'unknown' && roundedConfidence >= winnerThreshold;
  const soundClass = isClassified ? winnerClass : 'unknown';
  const isDrone = soundClass === 'drone' && countsAsDetection;

  return {
    class: soundClass,
    isDrone,
    isClassified,
    detectedState: best.key,
    detectedStateName: winnerTemplate?.name ?? best.key,
    detectedStateIcon: winnerTemplate?.icon ?? '❓',
    detectedStateColor: winnerTemplate?.color ?? '#999',
    confidence: roundedConfidence,
    confidenceLevel: level,
    samples,
    isDetected: isDrone,
    scores,
    temporalFeatures: features,
  };
}
