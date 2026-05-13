/**
 * AudioAnalyzer — главный класс сервиса.
 *
 * Объединяет live-режим (микрофон / произвольный MediaStream) и file-режим
 * (File / Blob / AudioBuffer) под единым API. Внутри:
 *   - чистая математика делегирована в src/math/
 *   - Web Audio управление и события — здесь
 *
 * Подписка: analyzer.on('frame', fr => ...), 'start', 'stop', 'error'.
 *
 * Этот файл — единственное место, где сервис трогает Web Audio API.
 */

import { logger } from '@membrana/core';

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
  AnalysisEvent,
  AnalysisEventMap,
  AnalysisListener,
  AnalysisStatistics,
  AudioAnalyzerConfig,
  CompleteTemporalPatterns,
  FileAnalysisResult,
  LiveFrameResult,
} from '../types.js';

import { createAudioContext, loadAudioBuffer } from './audio-helpers.js';

export class AudioAnalyzer {
  private config: AudioAnalyzerConfig;
  private fft: FftCore;
  private flux: SpectralFluxTracker;

  // Live-состояние.
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private liveStream: MediaStream | null = null;
  private rafId: number | null = null;
  private running = false;

  // Подписки.
  private readonly listeners: {
    [K in AnalysisEvent]: Set<AnalysisListener<K>>;
  } = {
    start: new Set(),
    stop: new Set(),
    frame: new Set(),
    error: new Set(),
  };

  constructor(config: Partial<AudioAnalyzerConfig> = {}) {
    this.config = applyPreset(config);
    this.fft = new FftCore(this.config.fftSize);
    this.flux = new SpectralFluxTracker();
  }

  // ============= Публичный API: события =============

  on<E extends AnalysisEvent>(event: E, listener: AnalysisListener<E>): void {
    this.listeners[event].add(listener as AnalysisListener<E>);
  }

  off<E extends AnalysisEvent>(event: E, listener: AnalysisListener<E>): void {
    this.listeners[event].delete(listener as AnalysisListener<E>);
  }

  private emit<E extends AnalysisEvent>(
    event: E,
    payload: AnalysisEventMap[E],
  ): void {
    for (const fn of this.listeners[event]) {
      try {
        (fn as (p: AnalysisEventMap[E]) => void)(payload);
      } catch (err) {
        logger.error('AudioAnalyzer listener threw', { event, err });
      }
    }
  }

  // ============= Публичный API: конфигурация =============

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

    if (this.analyserNode) {
      this.analyserNode.fftSize = next.fftSize;
      this.analyserNode.smoothingTimeConstant = next.smoothingTimeConstant;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  // ============= Live-режим =============

  /**
   * Начинает анализ в реальном времени.
   * @param stream опциональный MediaStream; если не указан — запрашивается микрофон.
   */
  async startLive(stream?: MediaStream): Promise<void> {
    if (this.running) return;

    try {
      const targetStream =
        stream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
      this.liveStream = targetStream;

      this.audioContext = createAudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(targetStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.sourceNode.connect(this.analyserNode);

      await this.audioContext.resume();
      this.running = true;
      this.flux.reset();
      this.emit('start', undefined);
      this.startLiveLoop();
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      this.stopLive();
      throw err;
    }
  }

  /** Останавливает live-режим, освобождает ресурсы. */
  stopLive(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    if (this.liveStream) {
      this.liveStream.getTracks().forEach((t) => t.stop());
      this.liveStream = null;
    }

    const wasRunning = this.running;
    this.running = false;
    if (wasRunning) this.emit('stop', undefined);
  }

  private startLiveLoop(): void {
    if (!this.analyserNode || !this.audioContext) return;

    const fftSize = this.config.fftSize;
    const timeBuffer = new Float32Array(fftSize);
    const frequencies = this.fft.computeFrequencies(this.audioContext.sampleRate);

    const loop = (): void => {
      if (!this.running || !this.analyserNode) return;
      this.analyserNode.getFloatTimeDomainData(timeBuffer);

      const frame = this.analyzeFrame(timeBuffer, frequencies);
      this.emit('frame', frame);

      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * Анализирует один временной буфер сэмплов (для AudioWorklet / тестов).
   * Не требует запущенного live-цикла.
   */
  analyzeBuffer(samples: Float32Array, sampleRate: number): LiveFrameResult {
    const frequencies = this.fft.computeFrequencies(sampleRate);
    return this.analyzeFrame(samples, frequencies);
  }

  // ============= File-режим =============

  /**
   * Анализирует целый аудио-файл / Blob / уже декодированный AudioBuffer.
   * @param source File / Blob / AudioBuffer
   * @param onProgress коллбэк прогресса [0..1]
   */
  async analyzeFile(
    source: File | Blob | AudioBuffer,
    onProgress?: (progress: number) => void,
  ): Promise<FileAnalysisResult> {
    const buffer =
      source instanceof AudioBuffer ? source : await loadAudioBuffer(source);

    const sampleRate = buffer.sampleRate;
    const duration = buffer.duration;
    const intervalSec = this.config.liveMode.intervalMs / 1_000;
    const totalFrames = Math.max(1, Math.floor(duration / intervalSec));
    const channel = buffer.getChannelData(0);

    const fftSize = this.config.fftSize;
    const frequencies = this.fft.computeFrequencies(sampleRate);
    const frames: LiveFrameResult[] = [];

    this.flux.reset();

    const window = new Float32Array(fftSize);
    const progressEvery = Math.max(1, Math.floor(totalFrames / 20));

    for (let i = 0; i < totalFrames; i++) {
      const start = Math.floor(i * intervalSec * sampleRate);
      const end = Math.min(start + fftSize, channel.length);
      const segLen = end - start;

      // Копируем сегмент в окно нужной длины (хвост зануляется).
      for (let s = 0; s < fftSize; s++) {
        window[s] = s < segLen ? channel[start + s]! : 0;
      }

      const frame = this.analyzeFrame(window, frequencies, i * intervalSec);
      frames.push(frame);

      if (onProgress && i % progressEvery === 0) {
        onProgress(i / totalFrames);
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
        ? this.computeTemporalPatterns(frames, channel, sampleRate, duration)
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

  /** Считает один кадр: общая логика для live и file. */
  private analyzeFrame(
    samples: Float32Array,
    frequencies: Float32Array,
    timestamp?: number,
  ): LiveFrameResult {
    const magnitudes = this.fft.computeMagnitudes(samples);
    const { min: minF, max: maxF } = this.config.liveMode.frequencyRange;
    const filtered = applyFrequencyFilter(magnitudes, frequencies, minF, maxF);

    const centroid = spectralCentroid(filtered, frequencies);
    const flux = this.flux.next(filtered);
    const rmsValue = rms(samples);
    const isDetected = this.detect(centroid, flux, rmsValue);

    const adv = this.config.advancedAnalysis;
    return {
      timestamp: timestamp ?? Date.now(),
      centroid,
      flux,
      rms: rmsValue,
      isDetected,
      spectrum: adv.enabled && adv.calculateSpectrum ? filtered : undefined,
      lowEnergyPercent: adv.enabled ? lowEnergyPercent(filtered) : undefined,
      stability: adv.enabled ? stabilityFromFlux(flux) : undefined,
    };
  }

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
   * TODO (Математик): полноценные временные паттерны (огибающая, периодичность,
   * jump-detection, attack/decay). Сейчас возвращается частичный результат с
   * рассчитываемыми pure-метриками поверх агрегированных кадров.
   */
  private computeTemporalPatterns(
    frames: readonly LiveFrameResult[],
    samples: Float32Array,
    sampleRate: number,
    _duration: number,
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
      peakToAverageRatio: rmss.length > 0 ? Math.max(...rmss) / (summarize(rmss).mean || 1) : 0,
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
