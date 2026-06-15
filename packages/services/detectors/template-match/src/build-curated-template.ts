import {
  computeFrameHitRatio,
  computeTemporalFeatures,
  DEFAULT_FRAME_HIT_RATIO,
  type Bounds,
  type MetricSample,
  type PatternTemplate,
  type TemporalFeatures,
} from '@membrana/trends-detector-service';

import { DRONE_TEMPLATE_KEY_PREFIX } from './constants.js';

function boundsFromValues(values: readonly number[], paddingRatio = 0.12): Bounds {
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

function boundsAround(value: number, marginRatio = 0.35, floor = 0): Bounds {
  const magnitude = Math.max(Math.abs(value), 0.001);
  const margin = Math.max(magnitude * marginRatio, magnitude * 0.1, 0.001);
  return {
    min: Math.max(floor, value - margin),
    max: value + margin,
  };
}

function mergeBounds(a: Bounds, b: Bounds): Bounds {
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

function buildFrameHitRatio(
  samples: readonly MetricSample[],
  thresholds: PatternTemplate['thresholds'],
): Bounds {
  const actualPercent = Math.round(computeFrameHitRatio(samples, thresholds) * 100);
  const center = Math.min(100, Math.max(50, actualPercent));
  return {
    min: Math.max(50, center - 5) / 100,
    max: Math.min(100, Math.max(center + 5, center + 1)) / 100,
  };
}

function buildTemporalPatterns(features: TemporalFeatures): PatternTemplate['temporalPatterns'] {
  return {
    centroidStd: boundsAround(features.centroidStd, 0.4, 0),
    fluxStd: boundsAround(features.fluxStd, 0.4, 0),
    rmsStd: boundsAround(features.rmsStd, 0.4, 0),
    activityRatio: boundsAround(features.activityRatio, 0.25, 0),
    avgSilenceDuration: boundsAround(features.avgSilenceDuration, 0.5, 0),
    avgBurstDuration: boundsAround(features.avgBurstDuration, 0.5, 0),
    volumeTrend: [features.volumeTrend],
    frequencyTrend: [features.frequencyTrend],
    longTermStability: [features.longTermStability],
    periodicity: [features.periodicity],
    envelopeShape: [features.envelopeShape],
    peakToAverageRatio: boundsAround(features.peakToAverageRatio, 0.35, 1),
    frequencyJumps: features.frequencyJumps.enabled
      ? {
          enabled: true,
          minJumpsRequired: Math.max(0, features.frequencyJumps.actualJumps),
          densityPerSecond: {
            max: Math.max(
              features.frequencyJumps.densityPerSecond * 1.5,
              features.frequencyJumps.densityPerSecond + 0.5,
              0.5,
            ),
          },
        }
      : {
          enabled: false,
          minJumpsRequired: 8,
          densityPerSecond: { max: 3 },
        },
  };
}

/** Build a pattern template from one sample's metric series. */
export function buildTemplateFromMetricSamples(
  samples: readonly MetricSample[],
  key: string,
  name: string,
): PatternTemplate {
  if (samples.length === 0) {
    throw new Error('buildTemplateFromMetricSamples: empty samples');
  }

  const centroid = boundsFromValues(samples.map((s) => s.centroid));
  const flux = boundsFromValues(samples.map((s) => s.flux));
  const rmsBounds = boundsFromValues(samples.map((s) => s.rms));
  const thresholds: PatternTemplate['thresholds'] = {
    centroid,
    flux,
    rms: rmsBounds,
    frameHitRatio: buildFrameHitRatio(samples, { centroid, flux, rms: rmsBounds }),
  };

  const features = computeTemporalFeatures(samples, 0.02);

  return {
    key,
    name,
    icon: '🛸',
    color: '#ff6b6b',
    description: `Curated drone template (${samples.length} FFT measurements)`,
    thresholds,
    temporalPatterns: buildTemporalPatterns(features),
  };
}

/** Merge per-sample drone templates into one envelope template for classifyTrends. */
export function mergeCuratedDroneTemplate(
  templates: readonly PatternTemplate[],
  key = `${DRONE_TEMPLATE_KEY_PREFIX}_CURATED`,
): PatternTemplate {
  if (templates.length === 0) {
    throw new Error('mergeCuratedDroneTemplate: no templates');
  }

  const first = templates[0]!;
  let centroid = { ...first.thresholds.centroid };
  let flux = { ...first.thresholds.flux };
  let rmsBounds = { ...first.thresholds.rms };
  let frameHitRatio = first.thresholds.frameHitRatio ?? DEFAULT_FRAME_HIT_RATIO;

  for (const template of templates.slice(1)) {
    centroid = mergeBounds(centroid, template.thresholds.centroid);
    flux = mergeBounds(flux, template.thresholds.flux);
    rmsBounds = mergeBounds(rmsBounds, template.thresholds.rms);
    if (template.thresholds.frameHitRatio) {
      frameHitRatio = mergeBounds(frameHitRatio, template.thresholds.frameHitRatio);
    }
  }

  return {
    key,
    name: 'Дрон (curated free-v1)',
    icon: '🛸',
    color: '#ff6b6b',
    description: `Объединённый шаблон из ${templates.length} validated drone-сэмплов`,
    thresholds: {
      centroid,
      flux,
      rms: rmsBounds,
      frameHitRatio,
    },
    temporalPatterns: first.temporalPatterns,
  };
}
