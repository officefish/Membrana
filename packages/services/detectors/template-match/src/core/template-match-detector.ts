import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';

import { runTemplateMatchSampleAnalysis } from '../run-template-match-analysis.js';
import type { TemplateMatchDetectorConfig } from '../types.js';

export class TemplateMatchDetector implements DroneDetector {
  readonly name = 'template-match';
  readonly family = 'dsp' as const;

  private readonly config: TemplateMatchDetectorConfig;

  constructor(config: TemplateMatchDetectorConfig) {
    this.config = config;
  }

  detect(window: AudioWindow): Promise<DetectionResult> {
    const t0 = performance.now();
    const analysis = runTemplateMatchSampleAnalysis(
      window.samples,
      window.sampleRate,
      this.config,
      performance.now() - t0,
    );

    if (analysis.trendsResult.samples.length === 0) {
      return Promise.resolve({
        isDrone: false,
        confidence: 0,
        reasoning: 'Недостаточно данных для FFT-трендов',
        latencyMs: analysis.verdict.latencyMsTotal,
      });
    }

    const { trendsResult, verdict } = analysis;

    return Promise.resolve({
      isDrone: verdict.isDrone,
      confidence: verdict.confidence,
      reasoning: `${trendsResult.detectedStateName} (${Math.round(trendsResult.confidence)}%)`,
      features: {
        detectedState: trendsResult.detectedState === 'UNKNOWN' ? 0 : 1,
        metricSampleCount: trendsResult.samples.length,
        winnerScore: trendsResult.confidence,
      },
      latencyMs: verdict.latencyMsTotal,
    });
  }
}

export function createTemplateMatchDetector(
  config: TemplateMatchDetectorConfig,
): DroneDetector {
  return new TemplateMatchDetector(config);
}
