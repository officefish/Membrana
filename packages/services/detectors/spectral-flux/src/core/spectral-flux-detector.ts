import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';
import {
  FftCore,
  lowEnergyPercent,
  SpectralFluxTracker,
} from '@membrana/fft-analyzer-service';

import { DEFAULT_FFT_SIZE } from '../constants.js';
import { fftFrames, prepareFftSamples } from '@membrana/detector-base';
import {
  classifySpectralFluxFrame,
  DEFAULT_SPECTRAL_FLUX_DETECTOR_CONFIG,
} from '../math/classifier.js';
import type { SpectralFluxDetectorConfig } from '../types.js';

export class SpectralFluxDetector implements DroneDetector {
  readonly name = 'spectral-flux';
  readonly family = 'dsp' as const;

  private readonly config: SpectralFluxDetectorConfig;
  private readonly fft: FftCore;
  private readonly fluxTracker = new SpectralFluxTracker();

  constructor(config: Partial<SpectralFluxDetectorConfig> = {}) {
    this.config = { ...DEFAULT_SPECTRAL_FLUX_DETECTOR_CONFIG, ...config };
    this.fft = new FftCore(this.config.fftSize);
  }

  /**
   * Запись длиннее окна: кадры идут в трекер ПО ОДНОМУ, а не сливаются в средний спектр.
   *
   * Соседним детекторам запись сводится усреднением спектров, здесь это запрещено предметом:
   * поток есть разница между соседними кадрами, и усреднение стёрло бы измеряемое. Поэтому
   * один проход, а в нём — две разные величины: поток копится по кадрам, спектр копится ради
   * доли энергии низа (мера линейная, к разнице кадров не относящаяся).
   *
   * ВЕРДИКТ ПО СРЕДНЕМУ ПОТОКУ, А НЕ ПО МАКСИМУМУ. Дрон — источник устойчивый: винты держат
   * примерно одну спектральную форму, и поток между кадрами мал и ровен. Максимум отдал бы
   * вердикт по пятисекундной записи одному хлопку двери; среднее мерит устойчивость, ради
   * которой детектор и заведён. Довод проверен зубом «устойчивый тон с одним импульсом против
   * череды щелчков», а не оставлен рассуждением.
   *
   * ПЕРВЫЙ КАДР ПОСЛЕ СБРОСА В СРЕДНЕЕ НЕ ВХОДИТ: у него нет предшественника, `next()` отдаёт
   * ноль, и это начальное условие, а не измерение. Ноль в среднем занижал бы поток тем сильнее,
   * чем короче запись.
   *
   * ИЗВЕСТНЫЙ ПРЕДЕЛ, названный Дыниным на разборе блока и НЕ закрытый здесь. При
   * `timestamp ≠ 0` первый кадр записи считается наравне, потому что у трекера есть
   * предшественник от прошлого вызова. Но «прошлый вызов» не обязан быть соседним кадром этой
   * же записи: между ними мог смениться источник, и тогда первая разница — шов, а не поток
   * внутри записи. Дефект не заведён этим блоком, он старше: трекер жил между вызовами и
   * прежде. Закрыть его правкой здесь нельзя — нужен признак «запись та же» в `AudioWindow`,
   * то есть общий контракт `@membrana/detector-base`, а он вне зоны этого спринта (#1572).
   */
  private runRecord(samples: Float32Array, fftSize: number, afterReset: boolean): {
    flux: number;
    magnitudes: Float32Array;
    measured: boolean;
  } {
    let fluxSum = 0;
    let fluxCount = 0;
    let magSum: Float32Array | null = null;
    let magCount = 0;
    let firstFrame = true;

    for (const frame of fftFrames(samples, fftSize)) {
      const magnitudes = this.fft.computeMagnitudes(frame);
      const flux = this.fluxTracker.next(magnitudes);

      if (!(firstFrame && afterReset)) {
        fluxSum += flux;
        fluxCount += 1;
      }
      firstFrame = false;

      if (magSum === null) magSum = new Float32Array(magnitudes.length);
      if (magnitudes.length === magSum.length) {
        for (let i = 0; i < magSum.length; i += 1) magSum[i] = (magSum[i] ?? 0) + (magnitudes[i] ?? 0);
        magCount += 1;
      }
    }

    // Кадров не оказалось вовсе (запись короче окна сюда не попадает, но защита дешёвая):
    // отдаём прежнюю быструю ветку, а не выдуманные числа.
    if (magSum === null || magCount === 0) {
      const magnitudes = this.fft.computeMagnitudes(prepareFftSamples(samples, fftSize));
      return { flux: this.fluxTracker.next(magnitudes), magnitudes, measured: !afterReset };
    }

    for (let i = 0; i < magSum.length; i += 1) magSum[i] = (magSum[i] ?? 0) / magCount;
    return {
      flux: fluxCount === 0 ? 0 : fluxSum / fluxCount,
      magnitudes: magSum,
      measured: fluxCount > 0,
    };
  }

  detect(window: AudioWindow): Promise<DetectionResult> {
    const t0 = performance.now();
    const fftSize = this.config.fftSize;
    const afterReset = window.timestamp === 0;

    if (afterReset) {
      this.fluxTracker.reset();
    }

    // Путь `analyzeSample` не затронут: он подаёт куски ровно fftSize, и для них работает
    // прежняя ветка кадр-в-кадр — числа бенчмарка не сдвигаются. До 02.08 длинная запись
    // молча обрезалась до первых fftSize сэмплов (43 мс при 2048 и 48 кГц).
    const { flux, magnitudes, measured } =
      window.samples.length > fftSize
        ? this.runRecord(window.samples, fftSize, afterReset)
        : (() => {
            const prepared = prepareFftSamples(window.samples, fftSize);
            const m = this.fft.computeMagnitudes(prepared);
            return { flux: this.fluxTracker.next(m), magnitudes: m, measured: !afterReset };
          })();

    // Частота берётся из окна, а не из конфига: полоса низа задана в герцах и
    // обязана означать одно и то же на 48 kHz и на 16 kHz.
    const lowPct = lowEnergyPercent(magnitudes, window.sampleRate);
    // «Первый кадр» значит «потока ещё не измерено», а НЕ «начало записи». Раньше эти два
    // совпадали и признак брался прямо из timestamp. Для записи длиннее окна они разошлись:
    // поток внутри неё измерен многократно, и подать сюда `true` значило бы навсегда оставить
    // детектор в ответе «первый кадр — ждём следующий», то есть починить обрезку и не дать
    // вердикта (норма #1565: включение проверяется прогоном, а не наличием кода).
    const spectrum = classifySpectralFluxFrame(flux, lowPct, !measured, this.config);

    return Promise.resolve({
      isDrone: spectrum.isDrone,
      confidence: spectrum.confidence,
      reasoning: spectrum.reasoning,
      features: {
        spectralFlux: flux,
        lowEnergyPercent: lowPct,
      },
      latencyMs: performance.now() - t0,
    });
  }
}

export function createSpectralFluxDetector(
  config?: Partial<SpectralFluxDetectorConfig>,
): DroneDetector {
  return new SpectralFluxDetector(config);
}

export { DEFAULT_FFT_SIZE };
