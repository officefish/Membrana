/**
 * BufferPlayer — воспроизводит AudioBuffer и одновременно публикует поток
 * AudioSampleFrame, аналогично LiveSampler, но источник — не MediaStream,
 * а декодированный буфер.
 *
 * Это позволяет клиенту работать с файлами через единый паттерн engine'а:
 *   1. loadAudioBuffer(file) → AudioBuffer
 *   2. BufferPlayer.play(buffer) — engine сам поднимает AudioContext +
 *      BufferSourceNode + AnalyserNode + RAF, шлёт frames потребителю.
 *
 * События: start | stop | frame | ended | error.
 * Геттеры: getAnalyserNode / getAudioContext — для виджетов
 * `@membrana/audio-data-viz`, которые рендерятся напрямую от Web Audio.
 */

import { logger } from '@membrana/core';

import {
  type AudioSampleFrame,
  DEFAULT_LIVE_CAPTURE_CONFIG,
  type LiveCaptureConfig,
  type SampleFrameHandler,
} from '../types.js';

import { closeAudioContext, createAudioContext } from './audio-context.js';

export type BufferPlayerState =
  | 'idle'
  | 'starting'
  | 'playing'
  | 'ended'
  | 'stopped'
  | 'error';

export type BufferPlayerEvent = 'start' | 'stop' | 'ended' | 'frame' | 'error';

export interface BufferPlayerEventMap {
  start: void;
  stop: void;
  ended: void;
  frame: AudioSampleFrame;
  error: Error;
}

type Listener<E extends BufferPlayerEvent> = (
  payload: BufferPlayerEventMap[E],
) => void;

export class BufferPlayer {
  private config: LiveCaptureConfig;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private rafId: number | null = null;
  private state: BufferPlayerState = 'idle';

  private readonly listeners: {
    [K in BufferPlayerEvent]: Set<Listener<K>>;
  } = {
    start: new Set(),
    stop: new Set(),
    ended: new Set(),
    frame: new Set(),
    error: new Set(),
  };

  constructor(config: Partial<LiveCaptureConfig> = {}) {
    this.config = { ...DEFAULT_LIVE_CAPTURE_CONFIG, ...config };
  }

  // ============= Подписки =============

  on<E extends BufferPlayerEvent>(event: E, listener: Listener<E>): void {
    this.listeners[event].add(listener as Listener<E>);
  }

  off<E extends BufferPlayerEvent>(event: E, listener: Listener<E>): void {
    this.listeners[event].delete(listener as Listener<E>);
  }

  onFrame(handler: SampleFrameHandler): () => void {
    this.on('frame', handler);
    return () => this.off('frame', handler);
  }

  private emit<E extends BufferPlayerEvent>(
    event: E,
    payload: BufferPlayerEventMap[E],
  ): void {
    for (const fn of this.listeners[event]) {
      try {
        (fn as (p: BufferPlayerEventMap[E]) => void)(payload);
      } catch (err) {
        logger.error('BufferPlayer listener threw', { event, err });
      }
    }
  }

  // ============= Состояние / конфиг =============

  getState(): BufferPlayerState {
    return this.state;
  }

  isPlaying(): boolean {
    return this.state === 'playing';
  }

  getConfig(): LiveCaptureConfig {
    return this.config;
  }

  updateConfig(patch: Partial<LiveCaptureConfig>): void {
    this.config = { ...this.config, ...patch };
    if (this.analyserNode) {
      this.analyserNode.fftSize = this.config.bufferSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
    }
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  // ============= Воспроизведение =============

  /**
   * Запускает воспроизведение AudioBuffer.
   * Если плеер уже играет — сначала останавливает старое.
   */
  async play(buffer: AudioBuffer): Promise<void> {
    await this.stop();
    this.state = 'starting';

    try {
      this.audioContext = createAudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.bufferSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;

      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = buffer;
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      this.sourceNode.onended = (): void => {
        if (this.state !== 'playing') return;
        this.emit('ended', undefined);
        void this.stop();
      };

      await this.audioContext.resume();
      this.sourceNode.start(0);
      this.state = 'playing';
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

  /** Останавливает воспроизведение и освобождает ресурсы. */
  async stop(): Promise<void> {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
      } catch {
        /* already stopped */
      }
      try {
        this.sourceNode.disconnect();
      } catch {
        /* already disconnected */
      }
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
    const wasPlaying = this.state === 'playing' || this.state === 'starting';
    this.state = 'stopped';
    if (wasPlaying) this.emit('stop', undefined);
  }

  // ============= Внутренний цикл =============

  private startLoop(): void {
    if (!this.analyserNode || !this.audioContext) return;

    const bufferSize = this.config.bufferSize;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = new Float32Array(bufferSize);

    const loop = (): void => {
      if (this.state !== 'playing' || !this.analyserNode) return;
      this.analyserNode.getFloatTimeDomainData(buffer);

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
