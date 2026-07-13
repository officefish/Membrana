import {
  analyzeSample,
  type AnalyzeSampleOptions,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';
import {
  createCepstralDetector,
  DEFAULT_CONFIDENCE_THRESHOLD as CEPSTRAL_THRESHOLD,
  DEFAULT_FFT_SIZE as CEPSTRAL_FFT_SIZE,
} from '@membrana/cepstral-detector-service';
import {
  createHarmonicDetector,
  DEFAULT_CONFIDENCE_THRESHOLD as HARMONIC_THRESHOLD,
  DEFAULT_FFT_SIZE as HARMONIC_FFT_SIZE,
} from '@membrana/harmonic-detector-service';
import {
  createSpectralFluxDetector,
  DEFAULT_CONFIDENCE_THRESHOLD as FLUX_THRESHOLD,
  DEFAULT_FFT_SIZE as FLUX_FFT_SIZE,
} from '@membrana/spectral-flux-detector-service';
import { createYamnetDetector } from '@membrana/yamnet-detector-service';

// Разделяемый инфра-хелпер загрузки бандленных весов (без состояния плагина) —
// cross-plugin импорт по прецеденту CALIBRATED_SAMPLE_OPTIONS ниже, не связь плагин↔плагин.
import { loadYamnetBrowserModel } from '@/plugins/neural-drone-analyzer/yamnetBrowserModel';
import { CALIBRATED_SAMPLE_OPTIONS } from '@/plugins/sample-library-drone-analysis/detectorCalibrationPreset';

import { wrapNeuralWithTtl } from './neuralTtlDetector';

/**
 * Адаптер: базовый DSP-детектор → `DroneDetector`, чей `detect(window)` гоняет
 * КАЛИБРОВАННЫЙ `analyzeSample` над окном (per-frame hop + агрегация), а не одно
 * FFT-окно. Так EnsembleProducer (detection-ensemble-service) получает тот же
 * сырой confidence, что и остальной живой анализ клиента.
 */
function toWindowDetector(base: DroneDetector): DroneDetector {
  const options: AnalyzeSampleOptions = {
    ...(CALIBRATED_SAMPLE_OPTIONS[base.name] ?? {}),
    includeFrameVerdicts: false,
  };
  return {
    name: base.name,
    family: base.family,
    async detect(window: AudioWindow): Promise<DetectionResult> {
      const { verdict } = await analyzeSample(
        window.samples,
        window.sampleRate,
        base,
        options,
      );
      return {
        isDrone: verdict.isDrone,
        confidence: verdict.confidence,
        latencyMs: verdict.latencyMsTotal,
      };
    },
  };
}

/**
 * Живые детекторы для combined-продюсера: DSP-семейство (harmonic / cepstral /
 * spectral-flux) + нейро yamnet (мандат владельца 2026-07-13, консилиум
 * live-neural-combined-fusion) — combinedScore сливает DSP↔нейро (ND3, слабо
 * коррелированные профили ошибок). Одна точка: этот список питает и клиентский
 * плагин, и device-board мост (scenarioMicJournalBridge → EnsembleProducer).
 *
 * yamnet НЕ оборачивается в toWindowDetector: у него собственный ресемпл 16 кГц
 * и оконность модели. Вес — равный (1, вердикт точки 2); каденс — реже DSP через
 * wrapNeuralWithTtl (точка 3); отказ модели → present:false, ансамбль живёт
 * DSP-only (graceful EnsembleProducer), деградация видна меткой модальностей.
 */
export function createCombinedStreamDetectors(): DroneDetector[] {
  return [
    toWindowDetector(
      createHarmonicDetector({
        confidenceThreshold: HARMONIC_THRESHOLD,
        fftSize: HARMONIC_FFT_SIZE,
      }),
    ),
    toWindowDetector(
      createCepstralDetector({
        confidenceThreshold: CEPSTRAL_THRESHOLD,
        fftSize: CEPSTRAL_FFT_SIZE,
      }),
    ),
    toWindowDetector(
      createSpectralFluxDetector({
        confidenceThreshold: FLUX_THRESHOLD,
        fftSize: FLUX_FFT_SIZE,
      }),
    ),
    wrapNeuralWithTtl(
      createYamnetDetector({ modelProvider: loadYamnetBrowserModel }),
    ),
  ];
}
