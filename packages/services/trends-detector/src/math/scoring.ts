import type {
  FrequencyJumpsFeatures,
  FrequencyJumpsSpec,
  PatternTemplate,
  TemporalFeatures,
  TemporalPatternSpec,
} from '../types.js';
import { mean, membership } from './stats.js';

const TEMPORAL_WEIGHTS: Record<string, number> = {
  centroidStd: 0.06,
  fluxStd: 0.06,
  rmsStd: 0.06,
  activityRatio: 0.12,
  avgSilenceDuration: 0.08,
  avgBurstDuration: 0.08,
  frequencyJumps: 0.12,
  volumeTrend: 0.14,
  frequencyTrend: 0.14,
  longTermStability: 0.1,
  periodicity: 0.06,
  envelopeShape: 0.04,
  peakToAverageRatio: 0.04,
};

const SEMANTIC_GROUPS: Record<string, readonly string[]> = {
  stable: ['constant', 'steady', 'unchanging'],
  increasing: ['rising', 'growing', 'upward'],
  decreasing: ['falling', 'declining', 'downward'],
  fluctuating: ['variable', 'unstable', 'changing'],
  modulated: ['varying', 'fluctuating', 'oscillating'],
  oscillating: ['vibrating', 'pulsating', 'modulated'],
  veryLow: ['low', 'unstable', 'volatile'],
  low: ['veryLow', 'unstable'],
  medium: ['moderate', 'average'],
  high: ['veryHigh', 'stable'],
  veryHigh: ['high', 'stable', 'constant'],
  none: ['random', 'chaotic', 'aperiodic'],
  irregular: ['random', 'none', 'sporadic'],
  semiRegular: ['irregular', 'regular'],
  regular: ['periodic', 'rhythmic', 'consistent'],
  impulsive: ['sharp', 'peak', 'transient'],
  attackDecay: ['pluck', 'percussive'],
  sustained: ['continuous', 'constant', 'steady'],
  pluck: ['attackDecay', 'impulsive'],
  complex: ['irregular', 'variable'],
};

function matchCategorical(actual: string, expected: readonly string[]): number {
  if (!actual || expected.length === 0) return 0;
  if (expected.includes(actual)) return 1;

  const similarToActual = SEMANTIC_GROUPS[actual] ?? [];
  for (const expectedVal of expected) {
    if (similarToActual.includes(expectedVal)) return 0.7;
    const similarToExpected = SEMANTIC_GROUPS[expectedVal] ?? [];
    if (similarToExpected.includes(actual)) return 0.7;
  }

  return 0.2;
}

function scoreFrequencyJumps(
  actual: FrequencyJumpsFeatures,
  expected: FrequencyJumpsSpec,
): number {
  const actualJumps = actual.actualJumps;
  const { minJumpsRequired, enabled, densityPerSecond: expectedDensity } = expected;

  if (!enabled) {
    if (actualJumps === 0) return 1;
    return Math.max(0, 1 - Math.log10(actualJumps + 1) / 2);
  }

  let score = 0;
  let weightSum = 0;

  if (actualJumps >= minJumpsRequired) {
    score += 1;
  } else if (actualJumps > 0) {
    score += actualJumps / minJumpsRequired;
  }
  weightSum += 1;

  if (expectedDensity?.max !== undefined && actual.densityPerSecond !== undefined) {
    const densityScore = Math.min(1, actual.densityPerSecond / expectedDensity.max);
    score += densityScore;
    weightSum += 1;
  }

  return weightSum > 0 ? score / weightSum : 0;
}

export function scorePatternField(
  patternName: string,
  actual: unknown,
  expected: unknown,
): number {
  if (patternName === 'frequencyJumps') {
    return scoreFrequencyJumps(
      actual as FrequencyJumpsFeatures,
      expected as FrequencyJumpsSpec,
    );
  }

  if (Array.isArray(expected)) {
    return matchCategorical(String(actual), expected);
  }

  if (
    typeof expected === 'object' &&
    expected !== null &&
    'min' in expected &&
    'max' in expected
  ) {
    const bounds = expected as { min: number; max: number };
    return membership(Number(actual), bounds.min, bounds.max);
  }

  if (typeof expected === 'string') {
    return expected === actual ? 1 : 0.3;
  }

  return 0;
}

export function scoreTemporalPatterns(
  features: TemporalFeatures,
  expected: TemporalPatternSpec,
): number {
  let score = 0;
  let totalWeight = 0;

  for (const [patternName, weight] of Object.entries(TEMPORAL_WEIGHTS)) {
    const spec = expected[patternName as keyof TemporalPatternSpec];
    const actual = features[patternName as keyof TemporalFeatures];
    if (spec === undefined || actual === undefined) continue;

    score += scorePatternField(patternName, actual, spec) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

export function scoreSpectral(
  template: PatternTemplate,
  centroidMean: number,
  fluxMean: number,
  rmsMean: number,
): number {
  let spectralScore = 0;
  let spectralWeight = 0;

  const { thresholds } = template;

  const centroidScore = membership(centroidMean, thresholds.centroid.min, thresholds.centroid.max);
  spectralScore += centroidScore * 0.35;
  spectralWeight += 0.35;

  const fluxScore = membership(fluxMean, thresholds.flux.min, thresholds.flux.max);
  spectralScore += fluxScore * 0.25;
  spectralWeight += 0.25;

  const rmsScore = membership(rmsMean, thresholds.rms.min, thresholds.rms.max);
  spectralScore += rmsScore * 0.2;
  spectralWeight += 0.2;

  return spectralWeight > 0 ? spectralScore / spectralWeight : 0;
}

export function scoreTemplate(
  features: TemporalFeatures,
  template: PatternTemplate,
  samples: readonly { centroid: number; flux: number; rms: number }[],
): { score: number; spectralScore: number; temporalScore: number } {
  const centroidMean = mean(samples.map((s) => s.centroid));
  const fluxMean = mean(samples.map((s) => s.flux));
  const rmsMean = mean(samples.map((s) => s.rms));

  const spectralScore = scoreSpectral(template, centroidMean, fluxMean, rmsMean);
  const temporalScore = scoreTemporalPatterns(features, template.temporalPatterns);
  const score = (spectralScore * 0.3 + temporalScore * 0.7) * 100;

  return { score, spectralScore: spectralScore * 100, temporalScore: temporalScore * 100 };
}
