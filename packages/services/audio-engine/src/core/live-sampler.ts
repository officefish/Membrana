/**
 * LiveSampler — преобразует MediaStream в поток AudioSampleFrame.
 *
 * Использует AnalyserNode + requestAnimationFrame для извлечения временных
 * сэмплов на каждом кадре. Является базой для ЛЮБОГО live-анализатора:
 * FFT, нейросетевого, LLM — все они подписываются на onFrame и получают
 * "сырой" Float32Array, не зная о Web Audio.
 *
 * Жизненный цикл: idle → starting → running → stopped (или error).
 */

import { logger } from '@membrana/core';

import {
  type AudioSampleFrame,
  DEFAULT_LIVE_CAPTURE_CONFIG,
  type LiveCaptureConfig,
  type LiveSamplerState,
  type SampleFrameHandler,
} from '../types.js';

import { closeAudioContext, createAudioContext } from './audio-context.js';
import { acquireMicrophone, releaseMediaStream } from './microphone.js';

export type LiveSamplerEvent = 'start' | 'stop' | 'frame' | 'error';

export interface LiveSamplerEventMap {
  start: void;
  stop: void;
  frame: AudioSampleFrame;
  error: Error;
}

type Listener<E extends LiveSamplerEvent> = (
  payload: LiveSamplerEventMap[E],
) => void;

export class LiveSampler {
  private config: LiveCaptureConfig;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private liveStream: MediaStream | null = null;
  private ownsStream = false;
  private rafId: number | null = null;
  private state: LiveSamplerState = 'idle';

  private readonly listeners: {
    [K in LiveSamplerEvent]: Set<Listener<K>>;
  } = {
    start: new Set(),
    stop: new Set(),
    frame: new Set(),
    error: new Set(),
  };

  constructor(config: Partial<LiveCaptureConfig> = {}) {
    this.config = { ...DEFAULT_LIVE_CAPTURE_CONFIG, ...config };
  }

  // ============= Подписки =============

  on<E extends LiveSamplerEvent>(event: E, listener: Listener<E>): void {
    this.listeners[event].add(listener as Listener<E>);
  }

  off<E extends LiveSamplerEvent>(event: E, listener: Listener<E>): void {
    this.listeners[event].delete(listener as Listener<E>);
  }

  /** Удобный шорткат: подписаться на кадры. Возвращает отписку. */
  onFrame(handler: SampleFrameHandler): () => void {
    this.on('frame', handler);
    return () => this.off('frame', handler);
  }

  private emit<E extends LiveSamplerEvent>(
    event: E,
    payload: LiveSamplerEventMap[E],
  ): void {
    for (const fn of this.listeners[event]) {
      try {
        (fn as (p: LiveSamplerEventMap[E]) => void)(payload);
      } catch (err) {
        logger.error('LiveSampler listener threw', { event, err });
      }
    }
  }

  // ============= Состояние и конфиг =============

  getState(): LiveSamplerState {
    return this.state;
  }

  isRunning(): boolean {
    return this.state === 'running';
  }

  getConfig(): LiveCaptureConfig {
    return this.config;
  }

  /**
   * AnalyserNode, через который engine выбирает сэмплы. Нужен визуализациям,
   * которые умеют рендериться напрямую от Web Audio (например, виджеты из
   * @membrana/audio-data-viz). Возвращает null, когда sampler не запущен.
   */
  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /** AudioContext, активный в данный момент. null до start() / после stop(). */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /** Текущий MediaStream, если sampler запущен. */
  getMediaStream(): MediaStream | null {
    return this.liveStream;
  }

  updateConfig(patch: Partial<LiveCaptureConfig>): void {
    this.config = { ...this.config, ...patch };
    if (this.analyserNode) {
      this.analyserNode.fftSize = this.config.bufferSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
    }
  }

  // ============= Запуск / остановка =============

  /**
   * Запускает сэмплирование. Если stream не передан — запрашивает микрофон.
   */
  async start(stream?: MediaStream): Promise<void> {
    if (this.state === 'running' || this.state === 'starting') return;
    this.state = 'starting';

    try {
      if (stream) {
        this.liveStream = stream;
        this.ownsStream = false;
      } else {
        this.liveStream = await acquireMicrophone();
        this.ownsStream = true;
      }

      this.audioContext = createAudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(this.liveStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.bufferSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.sourceNode.connect(this.analyserNode);

      await this.audioContext.resume();

      this.state = 'running';
      this.emit('start', undefined);
      this.startLoop();
    } catch (err) {
      this.state = 'error';
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      await this.stop();
      throw error;
    }
  }

  /** Останавливает сэмплер, освобождает все ресурсы. */
  async stop(): Promise<void> {
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
      await closeAudioContext(this.audioContext);
      this.audioContext = null;
    }
    if (this.ownsStream && this.liveStream) {
      releaseMediaStream(this.liveStream);
    }
    this.liveStream = null;
    this.ownsStream = false;

    const wasRunning = this.state === 'running';
    this.state = 'stopped';
    if (wasRunning) this.emit('stop', undefined);
  }

  // ============= Внутренний цикл =============

  private startLoop(): void {
    if (!this.analyserNode || !this.audioContext) return;

    const bufferSize = this.config.bufferSize;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = new Float32Array(bufferSize);

    const loop = (): void => {
      if (this.state !== 'running' || !this.analyserNode) return;

      this.analyserNode.getFloatTimeDomainData(buffer);

      // Копия буфера — чтобы потребитель мог хранить кадр, не боясь, что
      // следующий getFloatTimeDomainData затрёт данные.
      const frame: AudioSampleFrame = {
        samples: new Float32Array(buffer),
        sampleRate,
        timestamp: Date.now(),
      };
      this.emit('frame', frame);

      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }
}
