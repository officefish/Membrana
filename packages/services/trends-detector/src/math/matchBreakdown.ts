import type {
  FrequencyJumpsFeatures,
  FrequencyJumpsSpec,
  MatchFieldBreakdown,
  PatternTemplate,
  TemporalFeatures,
  TemporalPatternSpec,
  TemplateMatchBreakdown,
} from '../types.js';
import { mean, membership } from './stats.js';
import { scorePatternField, scoreTemplate } from './scoring.js';

const SPECTRAL_FIELDS = [
  { field: 'centroid', weight: 0.35, unit: 'Hz', decimals: 0 },
  { field: 'flux', weight: 0.25, unit: '', decimals: 3 },
  { field: 'rms', weight: 0.2, unit: '', decimals: 4 },
] as const;

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

function formatNumber(value: number, decimals: number, unit: string): string {
  const formatted = value.toFixed(decimals);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatBounds(min: number, max: number, unit: string, decimals: number): string {
  return `${formatNumber(min, decimals, unit)} – ${formatNumber(max, decimals, unit)}`;
}

function formatExpected(
  patternName: string,
  spec: unknown,
): string {
  if (patternName === 'frequencyJumps') {
    const jumps = spec as FrequencyJumpsSpec;
    if (!jumps.enabled) {
      return 'скачки не ожидаются';
    }
    const parts = [`≥ ${jumps.minJumpsRequired} скачков`];
    if (jumps.densityPerSecond?.max !== undefined) {
      parts.push(`≤ ${jumps.densityPerSecond.max}/с`);
    }
    return parts.join(', ');
  }

  if (Array.isArray(spec)) {
    return spec.join(' | ');
  }

  if (
    typeof spec === 'object' &&
    spec !== null &&
    'min' in spec &&
    'max' in spec
  ) {
    const bounds = spec as { min: number; max: number };
    if (patternName === 'activityRatio') {
      return `${(bounds.min * 100).toFixed(0)}% – ${(bounds.max * 100).toFixed(0)}%`;
    }
    if (
      patternName === 'avgSilenceDuration' ||
      patternName === 'avgBurstDuration'
    ) {
      return formatBounds(bounds.min * 1000, bounds.max * 1000, 'мс', 0);
    }
    const decimals =
      patternName === 'peakToAverageRatio'
        ? 2
        : patternName.includes('Std') || patternName === 'fluxStd'
          ? 3
          : 2;
    return formatBounds(bounds.min, bounds.max, '', decimals);
  }

  return String(spec);
}

function formatActual(patternName: string, actual: unknown): string {
  if (patternName === 'frequencyJumps') {
    const jumps = actual as FrequencyJumpsFeatures;
    return `${jumps.actualJumps} скачков, ${jumps.densityPerSecond.toFixed(1)}/с`;
  }

  if (typeof actual === 'number') {
    if (patternName === 'activityRatio') {
      return `${(actual * 100).toFixed(1)}%`;
    }
    if (
      patternName === 'avgSilenceDuration' ||
      patternName === 'avgBurstDuration'
    ) {
      return `${(actual * 1000).toFixed(0)} мс`;
    }
    if (patternName === 'centroid' || patternName === 'centroidStd') {
      return formatNumber(actual, patternName === 'centroid' ? 0 : 1, 'Hz');
    }
    if (patternName === 'flux' || patternName === 'fluxStd') {
      return actual.toFixed(3);
    }
    if (patternName === 'rms' || patternName === 'rmsStd') {
      return actual.toFixed(4);
    }
    return actual.toFixed(2);
  }

  return String(actual);
}

function buildSpectralFields(
  template: PatternTemplate,
  centroidMean: number,
  fluxMean: number,
  rmsMean: number,
): MatchFieldBreakdown[] {
  const means = {
    centroid: centroidMean,
    flux: fluxMean,
    rms: rmsMean,
  };

  return SPECTRAL_FIELDS.map(({ field, weight, unit, decimals }) => {
    const threshold = template.thresholds[field];
    const actualValue = means[field];
    const match = membership(actualValue, threshold.min, threshold.max);
    return {
      field,
      category: 'spectral',
      actual: formatNumber(actualValue, decimals, unit),
      expected: formatBounds(threshold.min, threshold.max, unit, decimals),
      matchPercent: Math.round(match * 100),
      weight,
    };
  });
}

function buildTemporalFields(
  features: TemporalFeatures,
  expected: TemporalPatternSpec,
): MatchFieldBreakdown[] {
  const rows: MatchFieldBreakdown[] = [];

  for (const [patternName, weight] of Object.entries(TEMPORAL_WEIGHTS)) {
    const spec = expected[patternName as keyof TemporalPatternSpec];
    const actual = features[patternName as keyof TemporalFeatures];
    if (spec === undefined || actual === undefined) continue;

    const match = scorePatternField(patternName, actual, spec);
    rows.push({
      field: patternName,
      category: 'temporal',
      actual: formatActual(patternName, actual),
      expected: formatExpected(patternName, spec),
      matchPercent: Math.round(match * 100),
      weight,
    });
  }

  return rows;
}

export function buildTemplateMatchBreakdown(
  features: TemporalFeatures,
  template: PatternTemplate,
  samples: readonly { centroid: number; flux: number; rms: number }[],
): TemplateMatchBreakdown {
  const centroidMean = mean(samples.map((s) => s.centroid));
  const fluxMean = mean(samples.map((s) => s.flux));
  const rmsMean = mean(samples.map((s) => s.rms));
  const scored = scoreTemplate(features, template, samples);

  return {
    templateKey: template.key,
    overallScore: Math.round(scored.score),
    spectralScore: Math.round(scored.spectralScore),
    temporalScore: Math.round(scored.temporalScore),
    fields: [
      ...buildSpectralFields(template, centroidMean, fluxMean, rmsMean),
      ...buildTemporalFields(features, template.temporalPatterns),
    ],
  };
}
