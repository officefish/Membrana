/**
 * ND1 — YamnetDetector: zero-shot нейро-детекция дрона (эшелон 0, Способ A).
 *
 * Контракт `DroneDetector` (@membrana/detector-base). Модель ленится и кэшируется:
 * первый detect() платит загрузку графа + прогрев, дальше — только инференс.
 * Источник модели инжектится (`YamnetModelProvider`) — node и браузер читают
 * бандленные артефакты по-своему, ядро от среды не зависит.
 */

import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';

import { prepareWaveform } from '../math/resample.js';
import type { YamnetModel } from './model.js';
import { scoreToVerdict, meanScoresPerClass, type YamnetScoringOptions } from './scoring.js';

/** Поставщик загруженной модели (node: fs-артефакты; браузер: fetch бандла). */
export type YamnetModelProvider = () => Promise<YamnetModel>;

export interface YamnetDetectorOptions {
  readonly modelProvider: YamnetModelProvider;
  readonly scoring?: YamnetScoringOptions;
}

export class YamnetDetector implements DroneDetector {
  readonly name = 'yamnet';
  readonly family = 'neural' as const;

  private modelPromise: Promise<YamnetModel> | null = null;

  constructor(private readonly options: YamnetDetectorOptions) {}

  private loadModel(): Promise<YamnetModel> {
    // Кэш промиса: параллельные detect() не грузят модель дважды; при падении
    // загрузки кэш сбрасывается, следующий вызов попробует заново.
    if (this.modelPromise === null) {
      this.modelPromise = this.options.modelProvider().catch((error: unknown) => {
        this.modelPromise = null;
        throw error;
      });
    }
    return this.modelPromise;
  }

  async detect(window: AudioWindow): Promise<DetectionResult> {
    const startedAt = performance.now();
    const model = await this.loadModel();
    const waveform = prepareWaveform(window.samples, window.sampleRate);
    const { frameScores, frameCount } = await model.infer(waveform);
    const clipScores = meanScoresPerClass(frameScores, frameCount);
    const verdict = scoreToVerdict(clipScores, this.options.scoring);
    return {
      isDrone: verdict.isDrone,
      confidence: verdict.confidence,
      reasoning: verdict.reasoning,
      features: verdict.features,
      latencyMs: performance.now() - startedAt,
    };
  }
}

export function createYamnetDetector(options: YamnetDetectorOptions): DroneDetector {
  return new YamnetDetector(options);
}
