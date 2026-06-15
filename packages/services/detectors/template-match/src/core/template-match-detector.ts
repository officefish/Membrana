import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';
import { classifyTrends } from '@membrana/trends-detector-service';

import { collectMetricSamples } from '../collect-metric-samples.js';
import {
  DEFAULT_ACTIVITY_RMS_THRESHOLD,
  DEFAULT_INTERVAL_MS,
  DEFAULT_MEASUREMENTS_COUNT,
  DEFAULT_MIN_CONFIDENCE,
  DRONE_TEMPLATE_KEY_PREFIX,
} from '../constants.js';
import { isDroneTemplateKey } from '../resolve-catalog.js';
import type { TemplateMatchDetectorConfig } from '../types.js';

export class TemplateMatchDetector implements DroneDetector {
  readonly name = 'template-match';
  readonly family = 'dsp' as const;

  private readonly config: Required<
    Pick<
      TemplateMatchDetectorConfig,
      'templates' | 'minConfidence' | 'activityRmsThreshold' | 'droneKeyPrefix'
    >
  > & {
    metricCollection: NonNullable<TemplateMatchDetectorConfig['metricCollection']>;
  };

  constructor(config: TemplateMatchDetectorConfig) {
    if (config.templates.length === 0) {
      throw new Error('TemplateMatchDetector requires at least one template');
    }
    this.config = {
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

  detect(window: AudioWindow): Promise<DetectionResult> {
    const t0 = performance.now();
    const metricSamples = collectMetricSamples(
      window.samples,
      window.sampleRate,
      this.config.metricCollection,
    );

    if (metricSamples.length === 0) {
      return Promise.resolve({
        isDrone: false,
        confidence: 0,
        reasoning: 'Недостаточно данных для FFT-трендов',
        latencyMs: performance.now() - t0,
      });
    }

    const result = classifyTrends(metricSamples, this.config.templates, {
      minConfidence: this.config.minConfidence,
      activityRmsThreshold: this.config.activityRmsThreshold,
    });

    const isDrone =
      result.isDetected &&
      isDroneTemplateKey(result.detectedState, this.config.droneKeyPrefix) &&
      result.confidence >= this.config.minConfidence;

    const confidence = result.confidence / 100;

    return Promise.resolve({
      isDrone,
      confidence,
      reasoning: `${result.detectedStateName} (${Math.round(result.confidence)}%)`,
      features: {
        detectedState: result.detectedState === 'UNKNOWN' ? 0 : 1,
        metricSampleCount: metricSamples.length,
        winnerScore: result.confidence,
      },
      latencyMs: performance.now() - t0,
    });
  }
}

export function createTemplateMatchDetector(
  config: TemplateMatchDetectorConfig,
): DroneDetector {
  return new TemplateMatchDetector(config);
}
