import type { MetricSample, TemporalFeatures } from '../types.js';
import { mean, stdDev, variance } from './stats.js';

function analyzeTrend(values: readonly number[]): string {
  if (values.length < 10) return 'stable';

  const mid = Math.floor(values.length / 2);
  const firstAvg = mean(values.slice(0, mid));
  const secondAvg = mean(values.slice(mid));
  const ratio = secondAvg / (firstAvg || 1);

  if (ratio > 1.5) return 'increasing';
  if (ratio < 0.67) return 'decreasing';

  const v = variance(values);
  if (v > 0.1 * firstAvg) return 'oscillating';

  return 'stable';
}

function detectFrequencyJumps(
  centroidValues: readonly number[],
  durationSec: number,
): TemporalFeatures['frequencyJumps'] {
  const jumps: number[] = [];
  for (let i = 1; i < centroidValues.length; i++) {
    const jump = Math.abs(centroidValues[i]! - centroidValues[i - 1]!);
    if (jump > 50) jumps.push(jump);
  }

  return {
    enabled: jumps.length > 3,
    actualJumps: jumps.length,
    densityPerSecond: durationSec > 0 ? jumps.length / durationSec : 0,
    minJumpsRequired: 5,
    magnitudeRange:
      jumps.length > 0
        ? {
            min: Math.min(...jumps),
            max: Math.max(...jumps),
            avg: mean(jumps),
          }
        : { min: 0, max: 0, avg: 0 },
  };
}

function calculateStability(
  rmsValues: readonly number[],
  centroidValues: readonly number[],
): string {
  const rmsVariance = variance(rmsValues);
  const centroidVariance = variance(centroidValues) / 1000;
  const normalizedStability = 1 - (rmsVariance + centroidVariance) / 2;

  if (normalizedStability > 0.8) return 'veryHigh';
  if (normalizedStability > 0.6) return 'high';
  if (normalizedStability > 0.4) return 'medium';
  if (normalizedStability > 0.2) return 'low';
  return 'veryLow';
}

function autocorrelate(values: readonly number[]): number[] {
  const result = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < values.length - i; j++) {
      sum += values[j]! * values[j + i]!;
    }
    result[i] = sum / (values.length - i);
  }
  return result;
}

function findPeaks(values: readonly number[]): Array<{ index: number; value: number }> {
  const peaks: Array<{ index: number; value: number }> = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i]! > values[i - 1]! && values[i]! > values[i + 1]!) {
      peaks.push({ index: i, value: values[i]! });
    }
  }
  return peaks;
}

function detectPeriodicity(values: readonly number[]): string {
  const autocorr = autocorrelate(values);
  const peaks = findPeaks(autocorr);
  const significantPeaks = peaks.filter((p) => p.value > 0.3);

  if (significantPeaks.length === 0) return 'none';
  if (significantPeaks.length < 3) return 'irregular';

  const intervals: number[] = [];
  for (let i = 1; i < significantPeaks.length; i++) {
    intervals.push(significantPeaks[i]!.index - significantPeaks[i - 1]!.index);
  }

  const intervalStd = stdDev(intervals);
  const intervalMean = mean(intervals);
  if (intervalMean === 0) return 'irregular';

  const ratio = intervalStd / intervalMean;
  if (ratio < 0.2) return 'regular';
  if (ratio < 0.5) return 'semiRegular';
  return 'irregular';
}

function analyzeEnvelopeShape(rmsValues: readonly number[]): string {
  const maxIndex = rmsValues.indexOf(Math.max(...rmsValues));
  const maxValue = rmsValues[maxIndex] ?? 0;

  const attack = maxIndex > 0 ? rmsValues.slice(0, maxIndex) : [];
  const attackSlope =
    attack.length > 1 ? (maxValue - (attack[0] ?? 0)) / attack.length : 0;

  const decay = maxIndex < rmsValues.length - 1 ? rmsValues.slice(maxIndex) : [];
  const decaySlope =
    decay.length > 1
      ? ((decay[0] ?? 0) - (decay[decay.length - 1] ?? 0)) / decay.length
      : 0;

  if (attackSlope > 0.5 && decaySlope < 0.1) return 'impulsive';
  if (attackSlope > 0.2 && decaySlope > 0.2) return 'attackDecay';
  if (attackSlope < 0.05 && decaySlope < 0.05) return 'sustained';
  if (attackSlope > 0.1 && decaySlope < 0.05) return 'pluck';

  return 'complex';
}

export function computeTemporalFeatures(
  samples: readonly MetricSample[],
  activityRmsThreshold = 0.02,
): TemporalFeatures {
  const rmsValues = samples.map((s) => s.rms);
  const centroidValues = samples.map((s) => s.centroid);
  const fluxValues = samples.map((s) => s.flux);

  const durationSec =
    samples.length > 1
      ? Math.max(
          0.001,
          (samples[samples.length - 1]!.timestamp - samples[0]!.timestamp) / 1000,
        )
      : 0.001;
  const segmentDuration = durationSec / Math.max(samples.length, 1);

  let activeFrames = 0;
  let silenceDuration = 0;
  let silenceCount = 0;
  let currentSilence = 0;
  let burstDuration = 0;
  let burstCount = 0;
  let currentBurst = 0;

  for (const sample of samples) {
    const isActive = sample.rms > activityRmsThreshold;
    if (isActive) {
      activeFrames++;
      if (currentSilence > 0) {
        silenceDuration += currentSilence * segmentDuration;
        silenceCount++;
        currentSilence = 0;
      }
      currentBurst++;
    } else {
      if (currentBurst > 0) {
        burstDuration += currentBurst * segmentDuration;
        burstCount++;
        currentBurst = 0;
      }
      currentSilence++;
    }
  }

  if (currentBurst > 0) {
    burstDuration += currentBurst * segmentDuration;
    burstCount++;
  }

  const rmsMean = mean(rmsValues);

  return {
    centroidStd: stdDev(centroidValues),
    fluxStd: stdDev(fluxValues),
    rmsStd: stdDev(rmsValues),
    activityRatio: samples.length > 0 ? activeFrames / samples.length : 0,
    avgSilenceDuration: silenceCount > 0 ? silenceDuration / silenceCount : 0,
    avgBurstDuration: burstCount > 0 ? burstDuration / burstCount : 0,
    frequencyJumps: detectFrequencyJumps(centroidValues, durationSec),
    volumeTrend: analyzeTrend(rmsValues),
    frequencyTrend: analyzeTrend(centroidValues),
    longTermStability: calculateStability(rmsValues, centroidValues),
    periodicity: detectPeriodicity(rmsValues),
    envelopeShape: analyzeEnvelopeShape(rmsValues),
    peakToAverageRatio:
      rmsValues.length > 0 ? Math.max(...rmsValues) / (rmsMean || 1) : 1,
  };
}
