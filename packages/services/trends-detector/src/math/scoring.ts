import type {
  FrequencyJumpsFeatures,
  FrequencyJumpsSpec,
  PatternTemplate,
  SpectralThresholds,
  TemporalFeatures,
  TemporalPatternSpec,
} from '../types.js';
import { DEFAULT_FRAME_HIT_RATIO } from '../types.js';
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

export function isSampleInSpectralBounds(
  sample: { centroid: number; flux: number; rms: number },
  thresholds: SpectralThresholds,
): boolean {
  return (
    sample.centroid >= thresholds.centroid.min &&
    sample.centroid <= thresholds.centroid.max &&
    sample.flux >= thresholds.flux.min &&
    sample.flux <= thresholds.flux.max &&
    sample.rms >= thresholds.rms.min &&
    sample.rms <= thresholds.rms.max
  );
}

export function computeFrameHitRatio(
  samples: readonly { centroid: number; flux: number; rms: number }[],
  thresholds: SpectralThresholds,
): number {
  if (samples.length === 0) return 0;
  let hits = 0;
  for (const sample of samples) {
    if (isSampleInSpectralBounds(sample, thresholds)) hits++;
  }
  return hits / samples.length;
}

export function scoreSpectral(
  template: PatternTemplate,
  centroidMean: number,
  fluxMean: number,
  rmsMean: number,
  samples: readonly { centroid: number; flux: number; rms: number }[] = [],
): number {
  const { thresholds } = template;

  const centroidScore = membership(centroidMean, thresholds.centroid.min, thresholds.centroid.max);
  const fluxScore = membership(fluxMean, thresholds.flux.min, thresholds.flux.max);
  const rmsScore = membership(rmsMean, thresholds.rms.min, thresholds.rms.max);
  const meanPart = (centroidScore * 0.35 + fluxScore * 0.25 + rmsScore * 0.2) / 0.8;

  const actualHitRatio = computeFrameHitRatio(samples, thresholds);
  const expectedHitRatio = thresholds.frameHitRatio ?? DEFAULT_FRAME_HIT_RATIO;
  const hitScore = membership(
    actualHitRatio,
    expectedHitRatio.min,
    expectedHitRatio.max,
  );

  return meanPart * 0.7 + hitScore * 0.3;
}

export function scoreTemplate(
  features: TemporalFeatures,
  template: PatternTemplate,
  samples: readonly { centroid: number; flux: number; rms: number }[],
): { score: number; spectralScore: number; temporalScore: number } {
  const centroidMean = mean(samples.map((s) => s.centroid));
  const fluxMean = mean(samples.map((s) => s.flux));
  const rmsMean = mean(samples.map((s) => s.rms));

  const spectralScore = scoreSpectral(
    template,
    centroidMean,
    fluxMean,
    rmsMean,
    samples,
  );
  const temporalScore = scoreTemporalPatterns(features, template.temporalPatterns);
  const score = (spectralScore * 0.3 + temporalScore * 0.7) * 100;

  return { score, spectralScore: spectralScore * 100, temporalScore: temporalScore * 100 };
}
