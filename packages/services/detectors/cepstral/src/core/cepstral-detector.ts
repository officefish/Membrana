import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';
import { FftCore } from '@membrana/fft-analyzer-service';

import { DEFAULT_FFT_SIZE } from '../constants.js';
import { geometricMeanMagnitudes, prepareFftSamples } from '@membrana/detector-base';
import {
  classifyCepstrum,
  DEFAULT_CEPSTRAL_DETECTOR_CONFIG,
} from '../math/classifier.js';
import type { CepstralDetectorConfig } from '../types.js';

export class CepstralDetector implements DroneDetector {
  readonly name = 'cepstral';
  readonly family = 'dsp' as const;

  private readonly config: CepstralDetectorConfig;
  private readonly fft: FftCore;

  constructor(config: Partial<CepstralDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CEPSTRAL_DETECTOR_CONFIG, ...config };
    this.fft = new FftCore(this.config.fftSize);
  }

  detect(window: AudioWindow): Promise<DetectionResult> {
    const t0 = performance.now();
    const fftSize = this.config.fftSize;
    // Запись длиннее окна судится ЦЕЛИКОМ: спектры кадров сводятся СРЕДНИМ ГЕОМЕТРИЧЕСКИМ,
    // что тождественно усреднению кепстров кадров — IFFT линеен, а среднее логарифмов есть
    // логарифм среднего геометрического. Арифметическое среднее (которым вылечен гармонический
    // детектор) здесь размыло бы пик квефренции: log(среднего) ≠ среднее(log), разбор Дынина
    // 02.08. До 02.08 брались первые fftSize сэмплов — при 2048 и 48 кГц это 43 мс, то есть
    // сотая доля пятисекундной записи, и детектор об этом не сообщал.
    //
    // Путь `analyzeSample` не затронут: он подаёт куски ровно fftSize, и для них работает
    // прежняя быстрая ветка — числа бенчмарка не сдвигаются.
    const magnitudes =
      window.samples.length > fftSize
        ? (geometricMeanMagnitudes(window.samples, fftSize, (frame) =>
            this.fft.computeMagnitudes(frame),
          ) ?? this.fft.computeMagnitudes(prepareFftSamples(window.samples, fftSize)))
        : this.fft.computeMagnitudes(prepareFftSamples(window.samples, fftSize));
    const spectrum = classifyCepstrum(magnitudes, window.sampleRate, fftSize, {
      ...this.config,
      sampleRate: window.sampleRate,
    });

    return Promise.resolve({
      isDrone: spectrum.isDrone,
      confidence: spectrum.confidence,
      reasoning: spectrum.reasoning,
      fundamentalsHz: spectrum.fundamentalHz ? [spectrum.fundamentalHz] : undefined,
      features: {
        fundamentalHz: spectrum.fundamentalHz ?? 0,
        cepstrumPeak: spectrum.peakRatio,
      },
      latencyMs: performance.now() - t0,
    });
  }
}

export function createCepstralDetector(config?: Partial<CepstralDetectorConfig>): DroneDetector {
  return new CepstralDetector(config);
}

export { DEFAULT_FFT_SIZE };
