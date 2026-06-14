/**
 * FftAnalyzer — анализатор кадров через БПФ.
 *
 * ВАЖНОЕ изменение архитектуры:
 *   - Web Audio управление (микрофон / file → AudioBuffer / RAF-цикл) переехало
 *     в @membrana/audio-engine-service.
 *   - Этот класс — ЧИСТЫЙ аудио-анализатор: на вход Float32Array + sampleRate,
 *     на выход — метрики и детекция.
 *   - Жизненный цикл (если нужен) сервис выстраивает в своих хуках,
 *     подписываясь на поток AudioSampleFrame из engine.
 *
 * Это позволит создать рядом neural-analyzer / llm-analyzer на той же engine.
 */

import {
  type AudioSampleFrame,
  getMonoChannel,
} from '@membrana/audio-engine-service';

import { applyPreset } from '../constants.js';
import { FftCore } from '../math/fft.js';
import {
  SpectralFluxTracker,
  applyFrequencyFilter,
  lowEnergyPercent,
  rms,
  spectralCentroid,
  spectralFlatness,
  spectralRolloff,
  stabilityFromFlux,
  zeroCrossingRate,
} from '../math/metrics.js';
import { summarize } from '../math/statistics.js';
import type {
  AnalysisStatistics,
  AudioAnalyzerConfig,
  CompleteTemporalPatterns,
  FileAnalysisResult,
  LiveFrameResult,
} from '../types.js';

export class FftAnalyzer {
  private config: AudioAnalyzerConfig;
  private fft: FftCore;
  private readonly flux = new SpectralFluxTracker();

  constructor(config: Partial<AudioAnalyzerConfig> = {}) {
    this.config = applyPreset(config);
    this.fft = new FftCore(this.config.fftSize);
  }

  // ============= Конфигурация =============

  getConfig(): AudioAnalyzerConfig {
    return this.config;
  }

  updateConfig(patch: Partial<AudioAnalyzerConfig>): void {
    const next = applyPreset({ ...this.config, ...patch });
    const fftChanged = next.fftSize !== this.config.fftSize;
    this.config = next;
    if (fftChanged) {
      this.fft = new FftCore(next.fftSize);
      this.flux.reset();
    }
  }

  /** Сбрасывает stateful-метрики (flux). Вызывай перед новой сессией анализа. */
  resetState(): void {
    this.flux.reset();
  }

  // ============= Анализ =============

  /**
   * Анализирует один кадр от engine. Подписавшись на AudioSampleFrame через
   * useLiveSampler / useMicrophone, передавай frame сюда — получишь результат.
   */
  analyzeFrame(
    frame: AudioSampleFrame,
    fluxTracker?: SpectralFluxTracker,
  ): LiveFrameResult {
    return this.analyze(
      frame.samples,
      frame.sampleRate,
      frame.timestamp,
      fluxTracker,
    );
  }

  /**
   * Прямой анализ массива сэмплов. Полезен для тестов и AudioWorklet.
   * @param samples Float32Array длины >= fftSize
   * @param sampleRate sample rate в Гц
   * @param timestamp метка времени (по умолчанию Date.now())
   * @param fluxTracker опциональный трекер flux (для серий с интервалом — сравнение с предыдущим замером, не с RAF-кадром)
   */
  analyze(
    samples: Float32Array,
    sampleRate: number,
    timestamp: number = Date.now(),
    fluxTracker?: SpectralFluxTracker,
  ): LiveFrameResult {
    const frequencies = this.fft.computeFrequencies(sampleRate);
    const magnitudes = this.fft.computeMagnitudes(samples);
    const { min: minF, max: maxF } = this.config.liveMode.frequencyRange;
    const filtered = applyFrequencyFilter(magnitudes, frequencies, minF, maxF);

    const centroid = spectralCentroid(filtered, frequencies);
    const fluxValue = (fluxTracker ?? this.flux).next(filtered);
    const rmsValue = rms(samples);
    const isDetected = this.detect(centroid, fluxValue, rmsValue);

    const adv = this.config.advancedAnalysis;
    return {
      timestamp,
      centroid,
      flux: fluxValue,
      rms: rmsValue,
      isDetected,
      spectrum: adv.enabled && adv.calculateSpectrum ? filtered : undefined,
      lowEnergyPercent: adv.enabled ? lowEnergyPercent(filtered) : undefined,
      stability: adv.enabled ? stabilityFromFlux(fluxValue) : undefined,
    };
  }

  /**
   * Анализирует уже декодированный AudioBuffer (нарезка на кадры).
   * Для загрузки файла используй loadAudioBuffer из @membrana/audio-engine-service.
   */
  async analyzeAudioBuffer(
    buffer: AudioBuffer,
    onProgress?: (progress: number) => void,
  ): Promise<FileAnalysisResult> {
    const sampleRate = buffer.sampleRate;
    const duration = buffer.duration;
    const intervalSec = this.config.liveMode.intervalMs / 1_000;
    const totalFrames = Math.max(1, Math.floor(duration / intervalSec));
    const channel = getMonoChannel(buffer);

    const fftSize = this.config.fftSize;
    const window = new Float32Array(fftSize);
    const frames: LiveFrameResult[] = [];
    const progressEvery = Math.max(1, Math.floor(totalFrames / 20));

    this.flux.reset();

    for (let i = 0; i < totalFrames; i++) {
      const start = Math.floor(i * intervalSec * sampleRate);
      const end = Math.min(start + fftSize, channel.length);
      const segLen = end - start;
      for (let s = 0; s < fftSize; s++) {
        window[s] = s < segLen ? channel[start + s]! : 0;
      }
      frames.push(this.analyze(window, sampleRate, i * intervalSec));

      if (onProgress && i % progressEvery === 0) {
        onProgress(i / totalFrames);
      }
      // Возвращаем event loop, чтобы UI не висел на больших файлах.
      if (i % 100 === 0) {
        await Promise.resolve();
      }
    }
    if (onProgress) onProgress(1);

    const adv = this.config.advancedAnalysis;
    const statistics: AnalysisStatistics | undefined =
      adv.calculateStatistics || adv.enabled
        ? this.computeStatistics(frames)
        : undefined;
    const temporalPatterns: CompleteTemporalPatterns | undefined =
      adv.calculateTemporalPatterns
        ? this.computeTemporalPatterns(frames, channel, sampleRate)
        : undefined;

    return {
      duration,
      sampleRate,
      totalFrames: frames.length,
      frames,
      statistics,
      temporalPatterns,
    };
  }

  // ============= Внутреннее =============

  private detect(centroid: number, flux: number, rmsValue: number): boolean {
    const t = this.config.detectionThresholds;
    return (
      centroid >= t.centroidMin &&
      centroid <= t.centroidMax &&
      flux >= t.fluxMin &&
      flux <= t.fluxMax &&
      rmsValue >= t.rmsMin &&
      rmsValue <= t.rmsMax
    );
  }

  private computeStatistics(frames: readonly LiveFrameResult[]): AnalysisStatistics {
    const centroids = frames.map((f) => f.centroid);
    const fluxes = frames.map((f) => f.flux);
    const rmss = frames.map((f) => f.rms);
    const detected = frames.reduce((a, f) => a + (f.isDetected ? 1 : 0), 0);
    return {
      centroid: summarize(centroids),
      flux: summarize(fluxes),
      rms: summarize(rmss),
      detectionRate: frames.length > 0 ? detected / frames.length : 0,
    };
  }

  /**
   * TODO (Математик): полные временные паттерны — envelope shape, periodicity,
   * frequency jumps, attack/decay slope. Сейчас частичная реализация.
   */
  private computeTemporalPatterns(
    frames: readonly LiveFrameResult[],
    samples: Float32Array,
    sampleRate: number,
  ): CompleteTemporalPatterns {
    const centroids = frames.map((f) => f.centroid);
    const fluxes = frames.map((f) => f.flux);
    const rmss = frames.map((f) => f.rms);

    const fullMagnitudes = this.fft.computeMagnitudes(
      samples.length >= this.config.fftSize
        ? samples.subarray(0, this.config.fftSize)
        : padTo(samples, this.config.fftSize),
    );
    const frequencies = this.fft.computeFrequencies(sampleRate);
    const activityRatio =
      frames.reduce((a, f) => a + (f.isDetected ? 1 : 0), 0) /
      Math.max(1, frames.length);

    return {
      centroidStd: summarize(centroids).std,
      fluxStd: summarize(fluxes).std,
      rmsStd: summarize(rmss).std,
      activityRatio,
      avgSilenceDuration: 0,
      avgBurstDuration: 0,
      volumeTrend: 'stable',
      frequencyTrend: 'stable',
      longTermStability: activityRatio > 0.8 ? 'high' : 'medium',
      stabilityScore: 1 - summarize(fluxes).std,
      periodicity: 'none',
      periodicityStrength: 0,
      envelopeShape: 'complex',
      attackTime: 0,
      decayTime: 0,
      peakToAverageRatio:
        rmss.length > 0 ? Math.max(...rmss) / (summarize(rmss).mean || 1) : 0,
      zeroCrossingRate: zeroCrossingRate(samples) * (sampleRate / 2),
      spectralRolloff: spectralRolloff(fullMagnitudes, frequencies),
      spectralFlatness: spectralFlatness(fullMagnitudes),
    };
  }
}

function padTo(samples: Float32Array, size: number): Float32Array {
  if (samples.length >= size) return samples;
  const out = new Float32Array(size);
  out.set(samples);
  return out;
}
